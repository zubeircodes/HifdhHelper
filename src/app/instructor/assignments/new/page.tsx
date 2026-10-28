"use client";

import { useState, useMemo, useEffect, Suspense } from "react";
import { Eyebrow, IcoBack, IcoCheck, Avatar, VerseText } from "@/components/atoms";
import { SURAHS, getSurah, juzRange, rangeLabel, type AyahRange } from "@/lib/quran-meta";
import { getVerseRange } from "@/lib/quran-text";
import { createClient } from "@/lib/supabase";
import { loadSlotAssignments, itemLabel, type AssignmentItem } from "@/lib/assignments";
import { RECITERS, DEFAULT_RECITER } from "@/lib/audio";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";

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

function todayISO(): string {
  const d = new Date();
  const tz = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tz).toISOString().split("T")[0];
}

function NewAssignmentForm() {
  const params = useSearchParams();
  const router = useRouter();
  const preselect = params.get("student");
  const fromAssignment = params.get("from");

  const [categories, setCategories] = useState<LessonType[]>([]);
  const [students, setStudents] = useState<StudentSlot[]>([]);
  const [loading, setLoading] = useState(true);

  const [category, setCategory] = useState("");
  const [date, setDate] = useState(todayISO());
  const [startSurahNum, setStartSurahNum] = useState(1);
  const [endSurahNum, setEndSurahNum] = useState(1);
  const [startVerse, setStartVerse] = useState("1");
  const [endVerse, setEndVerse] = useState("7");
  const [juzFrom, setJuzFrom] = useState(1);
  const [juzTo, setJuzTo] = useState(1);
  const [queued, setQueued] = useState<AyahRange[]>([]);
  const [reciter, setReciter] = useState(DEFAULT_RECITER);
  const [repeat, setRepeat] = useState(5);
  const [selected, setSelected] = useState<string[]>(preselect ? [preselect] : []);
  const [previewHtml, setPreviewHtml] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  // Suggestions built from the student's last lesson (when ?from= is set).
  const [redoItems, setRedoItems] = useState<AssignmentItem[]>([]);
  const [nextNew, setNextNew] = useState<AyahRange | null>(null);
  const [newTypeId, setNewTypeId] = useState<string | null>(null);

  const startSurah = getSurah(startSurahNum);
  const endSurah = getSurah(endSurahNum);

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

      if (preselect && fromAssignment) {
        const past = await loadSlotAssignments(supabase, preselect, 10);
        const last = past.find((a) => a.id === fromAssignment) ?? past[0];
        if (last) {
          setRedoItems(last.items.filter((i) => i.evaluation?.result === "redo"));
          // Continue the most recent New Lesson from where it ended, same length.
          const newType = types?.find((t) => /new/i.test(t.name));
          if (newType) {
            setNewTypeId(newType.id);
            const lastNew = past
              .flatMap((a) => a.items)
              .find((i) => i.lesson_type_id === newType.id);
            if (lastNew) {
              const len = lastNew.surah === lastNew.end_surah
                ? lastNew.end_ayah - lastNew.start_ayah + 1
                : 5;
              const s = getSurah(lastNew.end_surah)!;
              if (lastNew.end_ayah < s.verses) {
                setNextNew({ surah: lastNew.end_surah, startAyah: lastNew.end_ayah + 1, endSurah: lastNew.end_surah, endAyah: Math.min(lastNew.end_ayah + len, s.verses) });
              } else if (lastNew.end_surah < 114) {
                const n = getSurah(lastNew.end_surah + 1)!;
                setNextNew({ surah: n.number, startAyah: 1, endSurah: n.number, endAyah: Math.min(len, n.verses) });
              }
            }
          }
        }
      }
      setLoading(false);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const current: AyahRange = useMemo(() => ({
    surah: startSurahNum,
    startAyah: parseInt(startVerse) || 1,
    endSurah: endSurahNum,
    endAyah: parseInt(endVerse) || 1,
  }), [startSurahNum, endSurahNum, startVerse, endVerse]);

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

  // All ranges that will be saved: queued ones plus the one being edited (if valid).
  const allRanges = useMemo(
    () => (validation.valid ? [...queued, current] : queued),
    [queued, current, validation.valid],
  );

  async function handleSubmit() {
    if (allRanges.length === 0) return;
    setSubmitError("");
    setSubmitting(true);

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    for (const slotId of selected) {
      const slot = students.find((s) => s.id === slotId);
      if (!slot) continue;

      const assignmentData: Record<string, unknown> = {
        student_slot_id: slotId,
        halaqa_id: slot.halaqa_id,
        date,
        created_by: user.id,
      };
      if (slot.claimed_by) assignmentData.student_id = slot.claimed_by;

      const { data: existing } = await supabase
        .from("assignments")
        .select("id")
        .eq("student_slot_id", slotId)
        .eq("date", date)
        .limit(1);

      let assignmentId: string;
      if (existing && existing.length > 0) {
        assignmentId = existing[0].id;
      } else {
        const { data, error } = await supabase
          .from("assignments")
          .insert(assignmentData)
          .select("id")
          .single();
        if (error || !data) {
          setSubmitError(error?.message || "Could not create assignment.");
          setSubmitting(false);
          return;
        }
        assignmentId = data.id;
      }

      const { error: iErr } = await supabase
        .from("assignment_items")
        .insert(allRanges.map((r) => ({
          assignment_id: assignmentId,
          lesson_type_id: category,
          surah: r.surah,
          start_ayah: r.startAyah,
          end_surah: r.endSurah,
          end_ayah: r.endAyah,
          reciter_ref: reciter,
          repetitions: repeat,
        })));

      if (iErr) {
        setSubmitError(iErr.message);
        setSubmitting(false);
        return;
      }

      const first = allRanges[0];
      await supabase.from("student_slots").update({
        current_surah: `${getSurah(first.surah)?.name} (${first.surah})`,
        current_verse: first.surah === first.endSurah
          ? `${first.startAyah}–${first.endAyah}`
          : `${first.startAyah} → ${first.endSurah}:${first.endAyah}`,
        updated_at: new Date().toISOString(),
      }).eq("id", slotId);
    }

    setSubmitting(false);
    setSubmitted(true);
    const back = preselect ? `/instructor/students/${preselect}` : "/instructor/assignments";
    setTimeout(() => router.push(back), 900);
  }

  useEffect(() => {
    const sv = parseInt(startVerse) || 0;
    if (sv >= 1 && startSurah && sv <= startSurah.verses) {
      getVerseRange(startSurahNum, sv, startSurahNum, sv).then((v) => {
        setPreviewHtml(v[0]?.text || "");
      });
    }
  }, [startSurahNum, startVerse, startSurah]);

  function applyRange(r: AyahRange) {
    setStartSurahNum(r.surah);
    setEndSurahNum(r.endSurah);
    setStartVerse(String(r.startAyah));
    setEndVerse(String(r.endAyah));
  }

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

  function queueCurrent() {
    if (!validation.valid) return;
    setQueued((q) => [...q, current]);
    // Start the next range right after the one just added.
    const s = getSurah(current.endSurah)!;
    if (current.endAyah < s.verses) {
      applyRange({ surah: current.endSurah, startAyah: current.endAyah + 1, endSurah: current.endSurah, endAyah: s.verses });
    } else if (current.endSurah < 114) {
      const n = getSurah(current.endSurah + 1)!;
      applyRange({ surah: n.number, startAyah: 1, endSurah: n.number, endAyah: n.verses });
    }
  }

  const toggle = (id: string) =>
    setSelected((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));

  const canSend = allRanges.length > 0 && selected.length > 0 && !submitting && !!category;

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
          <Link href={preselect ? `/instructor/students/${preselect}` : "/instructor/assignments"}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "inherit", textDecoration: "none" }}>
            <IcoBack /> {preselect ? "Student" : "Assignments"}
          </Link>
          <span>/</span>
          <span style={{ color: "var(--ink-0)" }}>New</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button className="hh-btn primary" disabled={!canSend} onClick={handleSubmit}>
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
          What are they learning?
        </h1>

        {categories.length > 0 ? (
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
        ) : (
          <p style={{ color: "var(--ink-2)", fontSize: 13 }}>
            No active lesson types. <Link href="/instructor/categories">Enable one</Link> first.
          </p>
        )}

        <div style={{ marginTop: 24, maxWidth: 220 }}>
          <Field label="For class on">
            <input className="hh-input hh-num" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
        </div>

        {(redoItems.length > 0 || nextNew) && (
          <div style={{ marginTop: 24, padding: "14px 16px", background: "var(--paper-3)" }}>
            <div className="hh-overline" style={{ marginBottom: 10 }}>From last lesson</div>
            {redoItems.length > 0 && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap", marginBottom: nextNew ? 10 : 0 }}>
                <span style={{ fontSize: 12.5, color: "var(--ink-1)" }}>
                  {redoItems.length === 1 ? "1 range" : `${redoItems.length} ranges`} marked Redo:{" "}
                  <span className="hh-serif">{redoItems.map(itemLabel).join(", ")}</span>
                </span>
                <button className="hh-btn" type="button" onClick={() => {
                  setQueued((q) => [...q, ...redoItems.map((i) => ({ surah: i.surah, startAyah: i.start_ayah, endSurah: i.end_surah, endAyah: i.end_ayah }))]);
                  setRedoItems([]);
                }}>
                  Carry over
                </button>
              </div>
            )}
            {nextNew && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <span style={{ fontSize: 12.5, color: "var(--ink-1)" }}>
                  Next new lesson: <span className="hh-serif">{rangeLabel(nextNew)}</span>
                </span>
                <button className="hh-btn" type="button" onClick={() => {
                  applyRange(nextNew);
                  if (newTypeId) setCategory(newTypeId);
                  setNextNew(null);
                }}>
                  Use it
                </button>
              </div>
            )}
          </div>
        )}

        {/* Queued ranges */}
        {queued.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div className="hh-overline" style={{ marginBottom: 8 }}>Ranges in this lesson</div>
            {queued.map((r, i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--paper-3)", marginBottom: 4 }}>
                <span className="hh-serif" style={{ fontSize: 13.5 }}>{rangeLabel(r)}</span>
                <button onClick={() => setQueued((q) => q.filter((_, j) => j !== i))}
                  style={{ border: 0, background: "transparent", color: "var(--ink-2)", cursor: "pointer", fontSize: 12 }}>
                  Remove
                </button>
              </div>
            ))}
          </div>
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

        {/* Juz quick-fill */}
        <div style={{ display: "flex", alignItems: "flex-end", gap: 12, marginTop: 16, flexWrap: "wrap" }}>
          <div style={{ width: 110 }}>
            <Field label="Or by juz">
              <select className="hh-input hh-num" value={juzFrom} onChange={(e) => { const v = +e.target.value; setJuzFrom(v); if (juzTo < v) setJuzTo(v); }} style={{ appearance: "auto" }}>
                {Array.from({ length: 30 }, (_, i) => i + 1).map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </Field>
          </div>
          <div style={{ width: 110 }}>
            <Field label="to juz">
              <select className="hh-input hh-num" value={juzTo} onChange={(e) => setJuzTo(+e.target.value)} style={{ appearance: "auto" }}>
                {Array.from({ length: 30 }, (_, i) => i + 1).filter((j) => j >= juzFrom).map((j) => <option key={j} value={j}>{j}</option>)}
              </select>
            </Field>
          </div>
          <button className="hh-btn" type="button" onClick={() => applyRange(juzRange(juzFrom, juzTo))} style={{ marginBottom: 1 }}>
            Fill range
          </button>
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
              Preview · {rangeLabel(current)} · {validation.totalAyat} ayāt
            </div>
            <VerseText html={previewHtml} style={{ fontSize: "1.6rem", textAlign: "center" }} />
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <button className="hh-btn" type="button" disabled={!validation.valid} onClick={queueCurrent}>
            + Add another range
          </button>
          <span style={{ fontSize: 11.5, color: "var(--ink-3)", marginLeft: 12 }}>
            For Review lessons with several passages.
          </span>
        </div>

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
          <p style={{ color: "var(--ink-2)", fontSize: 13 }}>
            No students yet. <Link href="/instructor/classes">Add one in Classes</Link>.
          </p>
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

export default function NewAssignment() {
  return (
    <Suspense fallback={<div style={{ padding: "22px 36px" }}><p style={{ color: "var(--ink-2)", fontSize: 13 }}>Loading...</p></div>}>
      <NewAssignmentForm />
    </Suspense>
  );
}
