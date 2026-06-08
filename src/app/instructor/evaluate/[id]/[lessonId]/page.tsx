"use client";

import { useState, useEffect, use } from "react";
import { Eyebrow, IcoBack, IcoPlay, VerseMark, VerseText } from "@/components/atoms";
import { createClient } from "@/lib/supabase";
import { getVerseRange } from "@/lib/quran-text";
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
  const [grade, setGrade] = useState<string>("pass");
  const [mistakes, setMistakes] = useState(0);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const router = useRouter();

  async function handleSubmitEval() {
    setSubmitError("");
    setSubmitting(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // Find today's assignment for this student slot
    const today = new Date().toISOString().split("T")[0];
    const { data: assignments } = await supabase
      .from("assignments")
      .select("id")
      .eq("student_slot_id", id)
      .eq("date", today)
      .limit(1);

    if (!assignments || assignments.length === 0) {
      setSubmitError("No assignment found for today. Assign a lesson first.");
      setSubmitting(false);
      return;
    }

    const { data: items } = await supabase
      .from("assignment_items")
      .select("id")
      .eq("assignment_id", assignments[0].id)
      .eq("lesson_type_id", lessonId)
      .limit(1);

    if (!items || items.length === 0) {
      setSubmitError("No assignment item found for this lesson type today.");
      setSubmitting(false);
      return;
    }

    // Create or update evaluation
    const { error } = await supabase
      .from("evaluations")
      .upsert({
        assignment_item_id: items[0].id,
        result: grade,
        note: note || null,
        evaluated_by: user.id,
        evaluated_at: new Date().toISOString(),
      }, { onConflict: "assignment_item_id" });

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

      // Get student
      const { data: slot } = await supabase
        .from("student_slots")
        .select("student_name, current_surah, current_verse")
        .eq("id", id)
        .single();

      if (slot) setStudentName(slot.student_name);

      // Get category
      const { data: cat } = await supabase
        .from("lesson_types")
        .select("name, description")
        .eq("id", lessonId)
        .single();

      if (cat) {
        setCategoryName(cat.name);
        setCategoryDesc(cat.description || "");
      }

      // Load sample verses (Al-Fatihah 1-4 as placeholder until real assignments exist)
      const v = await getVerseRange(1, 1, 1, 4);
      setVerses(v);
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
          <button className="hh-btn primary" disabled={submitting} onClick={handleSubmitEval}>
            {submitting ? "Submitting..." : "Submit evaluation"}
          </button>
        </div>
      </div>

      <div className="hh-evaluate-layout">
        {/* LEFT — mushaf view */}
        <div className="hh-evaluate-mushaf">
          <Eyebrow>{categoryName}{categoryDesc ? ` · ${categoryDesc}` : ""}</Eyebrow>
          <h1 className="hh-display" style={{ fontSize: 26, margin: "6px 0 4px" }}>
            Al-Fātiḥah · 1:1–4
          </h1>
          <div style={{ fontSize: 12.5, color: "var(--ink-2)", marginBottom: 32 }}>
            {studentName}
          </div>

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
              {[
                { k: "pass", label: "Pass" },
                { k: "partial", label: "Partial" },
                { k: "fail", label: "Redo" },
              ].map((opt) => {
                const active = grade === opt.k;
                return (
                  <button key={opt.k} onClick={() => setGrade(opt.k)}
                    style={{
                      flex: 1, padding: "12px 0",
                      background: active ? "var(--paper-2)" : "var(--paper-1)",
                      border: 0,
                      color: active ? `var(--${opt.k})` : "var(--ink-1)",
                      fontWeight: active ? 500 : 400, fontSize: 13, cursor: "pointer",
                    }}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 8 }}>
              <Eyebrow>Corrections</Eyebrow>
              <span className="hh-num" style={{ fontSize: 13, fontWeight: 500 }}>{mistakes}</span>
            </div>
            <input type="range" min="0" max="20" value={mistakes}
              onChange={(e) => setMistakes(+e.target.value)}
              style={{ width: "100%", accentColor: "var(--ink-0)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4, fontSize: 10.5, color: "var(--ink-3)" }}>
              <span>0</span><span>20+</span>
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
