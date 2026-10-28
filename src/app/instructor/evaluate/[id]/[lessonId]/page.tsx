"use client";

import { useState, useEffect, use } from "react";
import { Eyebrow, IcoBack, VerseMark, VerseText } from "@/components/atoms";
import { createClient } from "@/lib/supabase";
import { getVerseRange } from "@/lib/quran-text";
import { rangeLabel } from "@/lib/quran-meta";
import { formatDate, type EvalResult } from "@/lib/assignments";
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

interface Item {
  id: string;
  surah: number;
  start_ayah: number;
  end_surah: number;
  end_ayah: number;
  repetitions: number;
  assignment_id: string;
  date: string;
  lesson_type_name: string;
}

// `lessonId` in the URL is the assignment_item id.
export default function EvaluateLesson({ params }: { params: Promise<{ id: string; lessonId: string }> }) {
  const { id, lessonId } = use(params);

  const [studentName, setStudentName] = useState("");
  const [item, setItem] = useState<Item | null>(null);
  const [verses, setVerses] = useState<LoadedVerse[]>([]);
  const [grade, setGrade] = useState<EvalResult>("pass");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: slot } = await supabase
        .from("student_slots")
        .select("student_name")
        .eq("id", id)
        .single();
      if (slot) setStudentName(slot.student_name);

      const { data: row } = await supabase
        .from("assignment_items")
        .select("id, surah, start_ayah, end_surah, end_ayah, repetitions, assignment_id, assignments(date), lesson_types(name), evaluations(result, note)")
        .eq("id", lessonId)
        .single();

      if (!row) { setNotFound(true); setLoading(false); return; }

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const r = row as any;
      const one = (v: any) => (Array.isArray(v) ? v[0] : v);
      /* eslint-enable @typescript-eslint/no-explicit-any */
      const it: Item = {
        id: r.id,
        surah: r.surah,
        start_ayah: r.start_ayah,
        end_surah: r.end_surah ?? r.surah,
        end_ayah: r.end_ayah,
        repetitions: r.repetitions,
        assignment_id: r.assignment_id,
        date: one(r.assignments)?.date ?? "",
        lesson_type_name: one(r.lesson_types)?.name ?? "Lesson",
      };
      setItem(it);

      const existing = one(r.evaluations);
      if (existing) {
        setGrade(existing.result);
        setNote(existing.note || "");
      }

      const v = await getVerseRange(it.surah, it.start_ayah, it.end_surah, it.end_ayah);
      setVerses(v);
      setLoading(false);
    })();
  }, [id, lessonId]);

  async function handleSubmitEval() {
    if (!item) return;
    setSubmitError("");
    setSubmitting(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { error } = await supabase
      .from("evaluations")
      .upsert({
        assignment_item_id: item.id,
        result: grade,
        note: note.trim() || null,
        evaluated_by: user.id,
        evaluated_at: new Date().toISOString(),
      }, { onConflict: "assignment_item_id" });

    if (error) {
      setSubmitError(error.message);
      setSubmitting(false);
      return;
    }

    setSubmitting(false);
    router.push(`/instructor/evaluate/${id}?assignment=${item.assignment_id}`);
  }

  if (loading) {
    return (
      <div style={{ padding: "22px 36px" }}>
        <p style={{ color: "var(--ink-2)", fontSize: 13 }}>Loading...</p>
      </div>
    );
  }

  if (notFound || !item) {
    return (
      <div style={{ padding: "22px 36px" }}>
        <p style={{ color: "var(--ink-2)", fontSize: 13 }}>
          That lesson no longer exists. <Link href={`/instructor/evaluate/${id}`}>Back</Link>
        </p>
      </div>
    );
  }

  const label = rangeLabel({ surah: item.surah, startAyah: item.start_ayah, endSurah: item.end_surah, endAyah: item.end_ayah });
  const backHref = `/instructor/evaluate/${id}?assignment=${item.assignment_id}`;

  return (
    <>
      <div style={{
        padding: "22px 36px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--rule-1)", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, color: "var(--ink-2)", fontSize: 12.5 }}>
          <Link href={backHref} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "inherit", textDecoration: "none" }}>
            <IcoBack /> {studentName}
          </Link>
          <span>/</span>
          <span style={{ color: "var(--ink-0)" }}>{item.lesson_type_name}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="hh-btn primary" disabled={submitting} onClick={handleSubmitEval}>
            {submitting ? "Saving..." : "Save grade"}
          </button>
        </div>
      </div>

      <div className="hh-evaluate-layout">
        {/* LEFT — mushaf view */}
        <div className="hh-evaluate-mushaf">
          <Eyebrow>{item.lesson_type_name} · {formatDate(item.date)} · ×{item.repetitions}</Eyebrow>
          <h1 className="hh-display" style={{ fontSize: 26, margin: "6px 0 4px" }}>
            {label}
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
        </div>

        {/* RIGHT — evaluation form */}
        <div className="hh-evaluate-form">
          <div>
            <Eyebrow>Result</Eyebrow>
            <div style={{ marginTop: 14, display: "flex", gap: 1, background: "var(--rule-1)", border: "1px solid var(--rule-1)" }}>
              {([
                { k: "pass", label: "Pass", color: "var(--pass)" },
                { k: "redo", label: "Redo", color: "var(--fail)" },
              ] as { k: EvalResult; label: string; color: string }[]).map((opt) => {
                const active = grade === opt.k;
                return (
                  <button key={opt.k} onClick={() => setGrade(opt.k)}
                    style={{
                      flex: 1, padding: "12px 0",
                      background: active ? "var(--paper-2)" : "var(--paper-1)",
                      border: 0,
                      color: active ? opt.color : "var(--ink-1)",
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
              placeholder="Mistakes, tajweed points, what to focus on next time…"
              style={{ marginTop: 8, resize: "none", fontFamily: "var(--font-serif)", fontSize: 13, lineHeight: 1.6 }} />
            <div style={{ fontSize: 10.5, color: "var(--ink-3)", marginTop: 6 }}>
              Saved to {studentName}&apos;s history.
            </div>
          </div>

          {submitError && (
            <p style={{ color: "var(--fail)", fontSize: 12 }}>{submitError}</p>
          )}

          <hr className="hh-rule" />
          <Link href={backHref} className="hh-btn ghost"
            style={{ textDecoration: "none", justifyContent: "center" }}>
            Back to {studentName}&apos;s lessons
          </Link>
        </div>
      </div>
    </>
  );
}
