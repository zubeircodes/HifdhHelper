"use client";

import { useState, useMemo, useEffect } from "react";
import { Eyebrow, IcoBack, IcoCheck, Avatar, VerseText } from "@/components/atoms";
import { SURAHS, getSurah } from "@/lib/quran-meta";
import { getVerseRange } from "@/lib/quran-text";
import { createClient } from "@/lib/supabase";
import { RECITERS, DEFAULT_RECITER } from "@/lib/audio";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface LessonType { id: string; name: string; description: string | null; }
interface StudentSlot { id: string; student_name: string; halaqa_id: string; claimed_by: string | null; }

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "block" }}>
      <span style={{ display: "block", fontSize: 11, color: "var(--ink-2)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 8 }}>
        {label}
      </span>
      {children}
    </label>
  );
}

function getInitials(name: string): string {
  const parts = name.split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function NewAssignment() {
  const [categories, setCategories] = useState<LessonType[]>([]);
  const [students, setStudents] = useState<StudentSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState("");
  const [startSurahNum, setStartSurahNum] = useState(1);
  const [endSurahNum, setEndSurahNum] = useState(1);
  const [startVerse, setStartVerse] = useState("1");
  const [endVerse, setEndVerse] = useState("7");
  const [reciter, setReciter] = useState(DEFAULT_RECITER);
  const [repeat, setRepeat] = useState(5);
  const [selected, setSelected] = useState<string[]>([]);
  const [previewHtml, setPreviewHtml] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const startSurah = getSurah(startSurahNum);
  const endSurah = getSurah(endSurahNum);

  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const { data: types } = await supabase
        .from("lesson_types")
        .select("id, name, description")
        .eq("instructor_id", user.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (types && types.length > 0) {
        setCategories(types);
        setCategory(types[0].id);
      }

      const { data: halaqat } = await supabase
        .from("halaqat")
        .select("id")
        .eq("instructor_id", user.id);

      if (halaqat && halaqat.length > 0) {
        const halaqaIds = halaqat.map((h) => h.id);
        const { data: slots } = await supabase
          .from("student_slots")
          .select("id, student_name, halaqa_id, claimed_by")
          .in("halaqa_id", halaqaIds)
          .order("student_name", { ascending: true });

        if (slots) setStudents(slots);
      }
      setLoading(false);
    });
  }, []);

  async function handleSubmit() {
    setSubmitError("");
    setSubmitting(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const today = new Date().toISOString().split("T")[0];
    const sv = parseInt(startVerse) || 1;
    const ev = parseInt(endVerse) || 1;

    // Create an assignment for each selected student
    for (const slotId of selected) {
      const slot = students.find((s) => s.id === slotId);
      if (!slot) continue;

      // Create assignment using student_slot_id (works for both claimed and unclaimed)
      const assignmentData: Record<string, unknown> = {
        student_slot_id: slotId,
        halaqa_id: slot.halaqa_id,
        date: today,
        created_by: user.id,
      };
      // Also set student_id if the student has claimed their account
      if (slot.claimed_by) {
        assignmentData.student_id = slot.claimed_by;
      }

      // Check if assignment already exists for this slot + date
      const { data: existing } = await supabase
        .from("assignments")
        .select("id")
        .eq("student_slot_id", slotId)
        .eq("date", today)
        .limit(1);

      let assignment;
      let aErr;

      if (existing && existing.length > 0) {
        assignment = existing[0];
      } else {
        const result = await supabase
          .from("assignments")
          .insert(assignmentData)
          .select()
          .single();
        assignment = result.data;
        aErr = result.error;
      }

      if (aErr) {
        console.error("Assignment error:", aErr);
        setSubmitError(aErr.message);
        setSubmitting(false);
        return;
      }

      // Create assignment item
      const { error: iErr } = await supabase
        .from("assignment_items")
        .insert({
          assignment_id: assignment.id,
          lesson_type_id: category,
          surah: startSurahNum,
          start_ayah: sv,
          end_ayah: ev,
          reciter_ref: reciter,
          repetitions: repeat,
        });

      if (iErr) {
        console.error("Item error:", iErr);
        setSubmitError(iErr.message);
        setSubmitting(false);
        return;
      }

      // Update student slot's current lesson
      await supabase.from("student_slots").update({
        current_surah: `${startSurah?.name} (${startSurahNum})`,
        current_verse: `${sv}–${ev}`,
        updated_at: new Date().toISOString(),
      }).eq("id", slotId);
    }

    setSubmitting(false);
    setSubmitted(true);
    setTimeout(() => router.push("/instructor/assignments"), 1500);
  }

  // Load preview verse
  useEffect(() => {
    const sv = parseInt(startVerse) || 0;
    if (sv >= 1 && startSurah && sv <= startSurah.verses) {
      getVerseRange(startSurahNum, sv, startSurahNum, sv).then((v) => {
        setPreviewHtml(v[0]?.text || "");
      });
    }
  }, [startSurahNum, startVerse, startSurah]);

  const validation = useMemo(() => {
    const sv = parseInt(startVerse) || 0;
    const ev = parseInt(endVerse) || 0;
    const errors: string[] = [];
    if (!startSurah) { errors.push("Invalid start surah."); return { errors, valid: false, totalAyat: 0 }; }
    if (!endSurah) { errors.push("Invalid end surah."); return { errors, valid: false, totalAyat: 0 }; }
    if (sv < 1) errors.push("Start verse must be at least 1.");
    if (sv > startSurah.verses) errors.push(`${startSurah.name} only has ${startSurah.verses} verses.`);
    if (ev < 1) errors.push("End verse must be at least 1.");
    if (ev > endSurah.verses) errors.push(`${endSurah.name} only has ${endSurah.verses} verses.`);
    if (endSurahNum < startSurahNum) errors.push("End surah cannot be before start surah.");
    else if (startSurahNum === endSurahNum && ev < sv) errors.push("End verse must be after start verse.");

    let total = 0;
    if (errors.length === 0) {
      for (let sn = startSurahNum; sn <= endSurahNum; sn++) {
        const s = getSurah(sn)!;
        const first = sn === startSurahNum ? sv : 1;
        const last = sn === endSurahNum ? ev : s.verses;
        total += last - first + 1;
      }
    }
    return { errors, valid: errors.length === 0, totalAyat: total };
  }, [startSurahNum, endSurahNum, startVerse, endVerse, startSurah, endSurah]);

  function handleStartSurahChange(num: number) {
    setStartSurahNum(num);
    setEndSurahNum(num);
    setStartVerse("1");
    const s = getSurah(num);
    setEndVerse(s ? String(s.verses) : "1");
  }

  function handleEndSurahChange(num: number) {
    setEndSurahNum(num);
    if (num === startSurahNum) setEndVerse(startVerse);
    else { const s = getSurah(num); setEndVerse(s ? String(s.verses) : "1"); }
  }

  const toggle = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const rangeLabel = startSurahNum === endSurahNum
    ? `${startSurah?.name} ${startSurahNum}:${startVerse}–${endVerse}`
    : `${startSurah?.name} ${startSurahNum}:${startVerse} – ${endSurah?.name} ${endSurahNum}:${endVerse}`;

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
          <Link href="/instructor/assignments" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "inherit", textDecoration: "none" }}>
            <IcoBack /> Assignments
          </Link>
          <span>/</span>
          <span style={{ color: "var(--ink-0)" }}>New</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="hh-btn primary" disabled={!validation.valid || selected.length === 0 || submitting} onClick={handleSubmit}>
            {submitting ? "Sending..." : submitted ? "Sent!" : `Send to ${selected.length} student${selected.length === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>

      <div className="hh-page-padding" style={{ maxWidth: 760 }}>
        {submitError && (
          <p style={{ color: "var(--fail)", fontSize: 12, margin: "0 0 16px" }}>{submitError}</p>
        )}

        <Eyebrow>New assignment</Eyebrow>
        <h1 className="hh-display" style={{ fontSize: 32, margin: "6px 0 32px" }}>
          What are they learning today?
        </h1>

        {/* Lesson type */}
        {categories.length > 0 && (
          <Field label="Lesson type">
            <div className="hh-role-grid" style={{ maxWidth: "100%" }}>
              {categories.map((c) => {
                const active = category === c.id;
                return (
                  <button key={c.id} onClick={() => setCategory(c.id)}
                    style={{
                      flex: "1 1 auto", minWidth: 120, padding: "10px 14px",
                      background: active ? "var(--paper-2)" : "var(--paper-1)",
                      border: 0, cursor: "pointer", textAlign: "left",
                    }}>
                    <span className="hh-serif" style={{ fontSize: 14, color: active ? "var(--ink-0)" : "var(--ink-1)", fontWeight: active ? 500 : 400 }}>
                      {c.name}
                    </span>
                    {c.description && <span style={{ display: "block", fontSize: 10.5, color: "var(--ink-2)", marginTop: 2 }}>{c.description}</span>}
                  </button>
                );
              })}
            </div>
          </Field>
        )}

        {/* Surah + verse range */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 24 }}>
          <Field label="Start surah">
            <select className="hh-input" value={startSurahNum} onChange={(e) => handleStartSurahChange(+e.target.value)} style={{ appearance: "auto" }}>
              {SURAHS.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.nameArabic} ({s.name})</option>)}
            </select>
          </Field>
          <Field label={`Start verse (1–${startSurah?.verses || "?"})`}>
            <input className="hh-input hh-num" value={startVerse} onChange={(e) => setStartVerse(e.target.value)} type="number" min={1} max={startSurah?.verses} />
          </Field>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginTop: 16 }}>
          <Field label="End surah">
            <select className="hh-input" value={endSurahNum} onChange={(e) => handleEndSurahChange(+e.target.value)} style={{ appearance: "auto" }}>
              {SURAHS.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.nameArabic} ({s.name})</option>)}
            </select>
          </Field>
          <Field label={`End verse (1–${endSurah?.verses || "?"})`}>
            <input className="hh-input hh-num" value={endVerse} onChange={(e) => setEndVerse(e.target.value)} type="number" min={1} max={endSurah?.verses} />
          </Field>
        </div>

        {validation.errors.length > 0 && (
          <div style={{ marginTop: 16, padding: "12px 14px", background: "var(--paper-3)" }}>
            {validation.errors.map((err, i) => (
              <p key={i} style={{ color: "var(--fail)", fontSize: 12, margin: i > 0 ? "4px 0 0" : 0 }}>{err}</p>
            ))}
          </div>
        )}

        {validation.valid && previewHtml && (
          <div style={{ marginTop: 20, padding: "28px 30px", background: "var(--paper-3)" }}>
            <div className="hh-eyebrow" style={{ marginBottom: 10, textAlign: "center" }}>
              Preview · {rangeLabel} · {validation.totalAyat} ayāt
            </div>
            <VerseText html={previewHtml} style={{ fontSize: "1.6rem", textAlign: "center" }} />
          </div>
        )}

        <hr className="hh-rule" style={{ margin: "40px 0" }} />

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
          <Field label="Reciter">
            <select className="hh-input" value={reciter} onChange={(e) => setReciter(e.target.value)} style={{ appearance: "auto" }}>
              {RECITERS.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </Field>
          <Field label="Repeats">
            <input className="hh-input hh-num" type="number" min={1} max={100} value={repeat}
              onChange={(e) => { const v = parseInt(e.target.value); if (!isNaN(v) && v >= 1) setRepeat(v); }} />
          </Field>
        </div>

        <hr className="hh-rule" style={{ margin: "40px 0" }} />

        <div className="hh-overline" style={{ marginBottom: 14 }}>Send to</div>
        {students.length === 0 ? (
          <p style={{ color: "var(--ink-2)", fontSize: 13 }}>No students in your roster yet.</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 8 }}>
            {students.map((s) => {
              const sel = selected.includes(s.id);
              return (
                <div key={s.id} onClick={() => toggle(s.id)}
                  style={{
                    padding: "10px 12px", border: "1px solid var(--rule-1)",
                    background: sel ? "var(--paper-2)" : "transparent",
                    display: "flex", alignItems: "center", gap: 10, cursor: "pointer",
                  }}>
                  <span style={{
                    width: 14, height: 14, borderRadius: 7,
                    border: "1px solid var(--rule-3)",
                    background: sel ? "var(--ink-0)" : "transparent",
                    display: "inline-flex", alignItems: "center", justifyContent: "center",
                    color: "var(--paper-1)",
                  }}>
                    {sel && <IcoCheck s={9} />}
                  </span>
                  <Avatar initials={getInitials(s.student_name)} size={22} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 12.5, fontWeight: sel ? 500 : 400 }}>{s.student_name}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
