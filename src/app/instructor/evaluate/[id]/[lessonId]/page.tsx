"use client";

import { useState, useEffect, use } from "react";
import { Eyebrow, IcoBack, IcoPlay, VerseMark, VerseText } from "@/components/atoms";
import { createClient } from "@/lib/supabase";
import { getVerseRange } from "@/lib/quran-text";
import { GRADE_OPTIONS, type EvalResult } from "@/lib/grade";
import { formatAyahRange } from "@/lib/format";
import { getGradableAssignment, gradeItem } from "@/lib/data/grading";
import { evalOf } from "@/lib/data/normalize";
import type { AssignmentItemRow } from "@/lib/data/types";
import Link from "next/link";
import { useRouter } from "next/navigation";

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
      <span style={{ width: 8, height: 8, borderRadius: 4, background: color }} /> {label}
    </span>
  );
}

interface LoadedVerse { surah: number; verse: number; text: string; }

export default function EvaluateLesson({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = use(params);

  const [studentName, setStudentName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [categoryDesc, setCategoryDesc] = useState("");
  const [verses, setVerses] = useState<LoadedVerse[]>([]);
  const [grade, setGrade] = useState<EvalResult>("pass");
  const [note, setNote] = useState("");
  // The actual assigned item. Everything on this screen derives from it —
  // previously the mushaf showed a hardcoded Al-Fatihah 1:1-4 placeholder.
  const [item, setItem] = useState<AssignmentItemRow | null>(null);
  const [lessonDate, setLessonDate] = useState<string | null>(null);
  const [loadError, setLoadError] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const router = useRouter();

  async function handleSubmitEval() {
    if (!item) return;
    setSubmitError("");
    setSubmitting(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSubmitting(false); return; }

    // Grades the item loaded below, which is the student's LATEST assignment
    // regardless of date. The old code looked up `date = today` and refused
    // outright when the lesson had been set at the previous class — which is
    // exactly when a hifdh teacher hears it.
    const { error } = await gradeItem(supabase, {
      itemId: item.id,
      result: grade,
      note,
      userId: user.id,
    });

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.push(`/instructor/evaluate/${id}`);
  }

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const { data: slot } = await supabase
        .from("student_slots")
        .select("student_name")
        .eq("id", id)
        .single();
      if (slot) setStudentName(slot.student_name);

      const { data: cat } = await supabase
        .from("lesson_types")
        .select("name, description")
        .eq("id", lessonId)
        .single();
      if (cat) {
        setCategoryName(cat.name);
        setCategoryDesc(cat.description || "");
      }

      // The student's latest assignment, whatever its date.
      const assignment = await getGradableAssignment(supabase, id);
      const match = assignment?.assignment_items.find(
        (it) => it.lesson_type_id === lessonId
      );

      if (!assignment) {
        setLoadError("No assignment yet. Assign a lesson first.");
      } else if (!match) {
        setLoadError("This student has no lesson in this category yet.");
      } else {
        setItem(match);
        setLessonDate(assignment.date);
        const existing = evalOf(match);
        if (existing) {
          setGrade(existing.result);
          setNote(existing.note ?? "");
        }
        // The verses actually assigned. end_surah is populated on every row,
        // so a cross-surah range renders correctly too.
        const endSurah = (match as { end_surah?: number }).end_surah ?? match.surah;
        setVerses(
          await getVerseRange(match.surah, match.start_ayah, endSurah, match.end_ayah)
        );
      }

      setLoading(false);
    });
  }, [id, lessonId]);

  if (loading) {
    return (
      <div style={{ padding: "22px 36px" }}>
        <p style={{ color: "var(--ink-2)", fontSize: 13 }}>Loading...</p>
      </div>
    );
  }

  return (
    <>
      <div style={{
        padding: "22px 36px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--rule-1)", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, color: "var(--ink-2)", fontSize: 12.5 }}>
          <Link href={`/instructor/evaluate/${id}`} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "inherit", textDecoration: "none" }}>
            <IcoBack /> {studentName}
          </Link>
          <span>/</span>
          <span style={{ color: "var(--ink-0)" }}>{categoryName}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="hh-btn primary" disabled={submitting || !item} onClick={handleSubmitEval}>
            {submitting ? "Submitting..." : "Submit evaluation"}
          </button>
        </div>
      </div>

      <div className="hh-evaluate-layout">
        {/* LEFT — mushaf view */}
        <div className="hh-evaluate-mushaf">
          <Eyebrow>{categoryName}{categoryDesc ? ` · ${categoryDesc}` : ""}</Eyebrow>
          <h1 className="hh-display" style={{ fontSize: 26, margin: "6px 0 4px" }}>
            {item ? formatAyahRange(item) : "No lesson assigned"}
          </h1>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 32 }}>
            {studentName}
            {lessonDate ? ` · assigned ${lessonDate}` : ""}
          </div>
          {loadError && (
            <p style={{ color: "var(--fail)", fontSize: 12.5, marginBottom: 20 }}>{loadError}</p>
          )}

          <div style={{ background: "var(--paper-2)", border: "1px solid var(--rule-1)", padding: "24px 28px" }}>
            {verses.map((v) => (
              <div key={`${v.surah}:${v.verse}`} style={{ display: "flex", gap: 18, alignItems: "flex-start", padding: "10px 0" }}>
                <VerseMark n={v.verse} />
                <div style={{ flex: 1 }}>
                  <VerseText html={v.text} style={{ fontSize: 28 }} />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 24, display: "flex", gap: 22, flexWrap: "wrap", fontSize: 10.5, color: "var(--ink-2)" }}>
            <Legend color="var(--tj-madda-2)" label="Madd ×2" />
            <Legend color="var(--tj-madda-4)" label="Madd ×4" />
            <Legend color="var(--tj-ghunnah)" label="Ghunnah" />
            <Legend color="var(--tj-qalqalah)" label="Qalqalah" />
          </div>

          <div style={{
            marginTop: 28,
            display: "flex", alignItems: "center", gap: 16,
            padding: "14px 16px",
            background: "var(--paper-2)", border: "1px solid var(--rule-1)",
          }}>
            <span style={{
              width: 30, height: 30, borderRadius: 15,
              background: "var(--ink-0)", color: "var(--paper-1)",
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer",
            }}>
              <IcoPlay s={11} />
            </span>
            <span className="hh-num" style={{ fontSize: 11.5, color: "var(--ink-2)" }}>0:00 / 0:00</span>
            <div style={{ flex: 1, height: 2, background: "var(--rule-1)", borderRadius: 1 }} />
            <span style={{ fontSize: 11.5, color: "var(--ink-2)" }}>1.0×</span>
          </div>
        </div>

        {/* RIGHT — evaluation form */}
        <div className="hh-evaluate-form">
          <div>
            <Eyebrow>Result</Eyebrow>
            <div style={{ marginTop: 14, display: "flex", gap: 1, background: "var(--rule-1)", border: "1px solid var(--rule-1)" }}>
              {GRADE_OPTIONS.map((opt) => {
                const active = grade === opt.value;
                return (
                  <button key={opt.value} onClick={() => setGrade(opt.value)}
                    style={{
                      flex: 1, padding: "12px 0",
                      background: active ? "var(--paper-2)" : "var(--paper-1)",
                      border: 0,
                      color: active ? `var(--${opt.value})` : "var(--ink-1)",
                      fontWeight: active ? 500 : 400, fontSize: 13, cursor: "pointer",
                    }}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <Eyebrow>Note</Eyebrow>
            <textarea value={note} onChange={(e) => setNote(e.target.value)}
              className="hh-input" rows={5}
              placeholder="How did they do on this lesson?"
              style={{ marginTop: 8, resize: "none", fontFamily: "var(--font-serif)", fontSize: 13, lineHeight: 1.6 }} />
            <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 6 }}>
              Visible to {studentName} and their parents.
            </div>
          </div>

          {submitError && (
            <p style={{ color: "var(--fail)", fontSize: 12 }}>{submitError}</p>
          )}

          <hr className="hh-rule" />
          <Link href={`/instructor/evaluate/${id}`} className="hh-btn ghost"
            style={{ textDecoration: "none", justifyContent: "center" }}>
            Back to {studentName}&apos;s lessons
          </Link>
        </div>
      </div>
    </>
  );
}
