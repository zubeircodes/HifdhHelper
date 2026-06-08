"use client";

import { useState, useEffect, useCallback } from "react";
import { Eyebrow, Avatar, Status, IcoPlus } from "@/components/atoms";
import { createClient } from "@/lib/supabase";
import { SURAHS } from "@/lib/quran-meta";

interface StudentSlot {
  id: string;
  student_name: string;
  current_surah: string | null;
  current_verse: string | null;
  claim_code: string;
  claimed_by: string | null;
  halaqa_id: string;
}

interface Halaqa {
  id: string;
  name: string;
  students: StudentSlot[];
}

function getInitials(name: string): string {
  const parts = name.split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function ClassesPage() {
  const [classes, setClasses] = useState<Halaqa[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Create class
  const [showCreate, setShowCreate] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  // Add student
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newSurahNum, setNewSurahNum] = useState(1);
  const [newVerse, setNewVerse] = useState("1");
  const [addError, setAddError] = useState("");
  const [adding, setAdding] = useState(false);
  const [justAdded, setJustAdded] = useState<{ name: string; code: string } | null>(null);

  const newSurah = SURAHS.find((s) => s.number === newSurahNum);

  const loadData = useCallback(async () => {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data: halaqat } = await supabase
      .from("halaqat")
      .select("id, name")
      .eq("instructor_id", user.id)
      .order("created_at", { ascending: true });

    if (halaqat) {
      const halaqaIds = halaqat.map((h) => h.id);
      const { data: slots } = await supabase
        .from("student_slots")
        .select("*")
        .in("halaqa_id", halaqaIds)
        .order("created_at", { ascending: true });

      const classesWithStudents = halaqat.map((h) => ({
        ...h,
        students: (slots || []).filter((s) => s.halaqa_id === h.id),
      }));
      setClasses(classesWithStudents);
    }
    setLoading(false);
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  async function handleCreateClass(e: React.FormEvent) {
    e.preventDefault();
    setCreateError("");
    setCreating(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { error } = await supabase.from("halaqat").insert({ name: newClassName, instructor_id: user.id });
    if (error) { setCreateError(error.message); setCreating(false); return; }
    setNewClassName("");
    setCreating(false);
    setShowCreate(false);
    loadData();
  }

  async function handleAddStudent(e: React.FormEvent) {
    e.preventDefault();
    if (!addingTo) return;
    setAddError("");
    setAdding(true);
    setJustAdded(null);
    const supabase = createClient();
    const surahName = newSurah?.name || "";
    const { data, error } = await supabase.rpc("create_student_slot", {
      halaqa_uuid: addingTo,
      student_name_param: newName,
      current_surah_param: `${surahName} (${newSurahNum})`,
      current_verse_param: newVerse,
    });
    if (error) { setAddError(error.message); setAdding(false); return; }
    setJustAdded({ name: data.student_name, code: data.claim_code });
    setNewName("");
    setNewVerse("1");
    setAdding(false);
    loadData();
  }

  function copyCode(code: string) {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  }

  if (loading) {
    return <div style={{ padding: "22px 36px" }}><p style={{ color: "var(--ink-2)", fontSize: 13 }}>Loading...</p></div>;
  }

  return (
    <>
      <div style={{
        padding: "22px 36px", display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--rule-1)", flexWrap: "wrap", gap: 12,
      }}>
        <div>
          <Eyebrow>Teaching</Eyebrow>
          <h1 className="hh-display" style={{ fontSize: 24, margin: "6px 0 0" }}>Classes</h1>
        </div>
        <button className="hh-btn primary" onClick={() => setShowCreate(!showCreate)}>
          <IcoPlus /> New class
        </button>
      </div>

      {/* Create class panel */}
      {showCreate && (
        <div style={{ padding: "24px 36px", borderBottom: "1px solid var(--rule-1)", background: "var(--paper-3)" }}>
          <div style={{ maxWidth: 400 }}>
            <Eyebrow>New class</Eyebrow>
            <form onSubmit={handleCreateClass} style={{ marginTop: 16 }}>
              <label style={{ fontSize: 11.5, color: "var(--ink-2)", letterSpacing: "0.02em", display: "block", marginBottom: 6 }}>Class name</label>
              <input className="hh-input" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} placeholder="e.g. Boys 6–8" required style={{ marginBottom: 16 }} />
              {createError && <p style={{ color: "var(--fail)", fontSize: 12, margin: "0 0 12px" }}>{createError}</p>}
              <div style={{ display: "flex", gap: 8 }}>
                <button type="submit" className="hh-btn primary" disabled={creating || !newClassName.trim()}>{creating ? "Creating..." : "Create"}</button>
                <button type="button" className="hh-btn ghost" onClick={() => setShowCreate(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add student panel */}
      {addingTo && (
        <div style={{ padding: "24px 36px", borderBottom: "1px solid var(--rule-1)", background: "var(--paper-3)" }}>
          <div style={{ maxWidth: 480 }}>
            {justAdded ? (
              <>
                <Eyebrow>Student added</Eyebrow>
                <p style={{ color: "var(--ink-0)", fontSize: 14, fontWeight: 500, margin: "8px 0 4px" }}>{justAdded.name}</p>
                <p style={{ color: "var(--ink-2)", fontSize: 12.5, margin: "0 0 16px" }}>Share this code with them to link their account.</p>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
                  <div style={{ padding: "10px 16px", background: "var(--paper-2)", border: "1px solid var(--rule-1)" }}>
                    <span className="hh-num" style={{ fontSize: 20, letterSpacing: "0.14em", fontWeight: 500 }}>{justAdded.code}</span>
                  </div>
                  <button className="hh-btn" onClick={() => copyCode(justAdded.code)}>{copiedCode === justAdded.code ? "Copied" : "Copy"}</button>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button className="hh-btn primary" onClick={() => setJustAdded(null)}>Add another</button>
                  <button className="hh-btn ghost" onClick={() => { setAddingTo(null); setJustAdded(null); }}>Done</button>
                </div>
              </>
            ) : (
              <>
                <Eyebrow>Add student to {classes.find((c) => c.id === addingTo)?.name}</Eyebrow>
                <form onSubmit={handleAddStudent} style={{ marginTop: 16 }}>
                  <label style={{ fontSize: 11.5, color: "var(--ink-2)", letterSpacing: "0.02em", display: "block", marginBottom: 6 }}>Student name</label>
                  <input className="hh-input" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="e.g. Aisha Rahman" required style={{ marginBottom: 16 }} />
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: 11.5, color: "var(--ink-2)", letterSpacing: "0.02em", display: "block", marginBottom: 6 }}>Current surah</label>
                      <select className="hh-input" value={newSurahNum} onChange={(e) => setNewSurahNum(+e.target.value)} style={{ appearance: "auto" }}>
                        {SURAHS.map((s) => <option key={s.number} value={s.number}>{s.number}. {s.name}</option>)}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11.5, color: "var(--ink-2)", letterSpacing: "0.02em", display: "block", marginBottom: 6 }}>Current verse</label>
                      <input className="hh-input hh-num" value={newVerse} onChange={(e) => setNewVerse(e.target.value)} type="number" min={1} max={newSurah?.verses} />
                    </div>
                  </div>
                  {addError && <p style={{ color: "var(--fail)", fontSize: 12, margin: "0 0 12px" }}>{addError}</p>}
                  <div style={{ display: "flex", gap: 8 }}>
                    <button type="submit" className="hh-btn primary" disabled={adding || !newName.trim()}>{adding ? "Adding..." : "Add student"}</button>
                    <button type="button" className="hh-btn ghost" onClick={() => setAddingTo(null)}>Cancel</button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      <div className="hh-page-padding" style={{ maxWidth: 920 }}>
        {classes.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <p style={{ color: "var(--ink-2)", fontSize: 13, margin: "0 0 16px" }}>No classes yet.</p>
            <button className="hh-btn primary" onClick={() => setShowCreate(true)}><IcoPlus /> New class</button>
          </div>
        ) : (
          classes.map((c) => (
            <div key={c.id} style={{ marginBottom: 40 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <div className="hh-overline">{c.students.length} student{c.students.length === 1 ? "" : "s"}</div>
                  <h2 className="hh-serif" style={{ fontSize: 20, fontWeight: 500, marginTop: 4 }}>{c.name}</h2>
                </div>
                <button className="hh-btn" onClick={() => { setAddingTo(c.id); setJustAdded(null); }}>
                  <IcoPlus /> Add student
                </button>
              </div>

              {c.students.length === 0 ? (
                <p style={{ color: "var(--ink-3)", fontSize: 12.5, padding: "16px 0", borderTop: "1px solid var(--rule-1)" }}>
                  No students in this class yet.
                </p>
              ) : (
                <div style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 400 }}>
                    <thead>
                      <tr style={{ textAlign: "left", color: "var(--ink-2)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                        <th style={{ padding: "10px 0", fontWeight: 500, width: "35%" }}>Student</th>
                        <th style={{ padding: "10px 0", fontWeight: 500, width: "25%" }}>Current lesson</th>
                        <th style={{ padding: "10px 0", fontWeight: 500, width: "22%" }}>Claim code</th>
                        <th style={{ padding: "10px 0", fontWeight: 500, width: "18%", textAlign: "right" }}>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {c.students.map((s) => (
                        <tr key={s.id} style={{ borderTop: "1px solid var(--rule-1)" }}>
                          <td style={{ padding: "14px 0" }}>
                            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                              <Avatar initials={getInitials(s.student_name)} size={26} />
                              <span style={{ fontSize: 13, fontWeight: 500 }}>{s.student_name}</span>
                            </div>
                          </td>
                          <td style={{ padding: "14px 0", color: "var(--ink-1)", fontSize: 12.5 }} className="hh-serif">
                            {s.current_surah ? `${s.current_surah} : ${s.current_verse || "1"}` : "—"}
                          </td>
                          <td style={{ padding: "14px 0" }}>
                            <button onClick={() => copyCode(s.claim_code)}
                              style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 8, padding: 0 }}>
                              <span className="hh-num" style={{ fontSize: 12.5, letterSpacing: "0.08em", color: "var(--ink-0)" }}>{s.claim_code}</span>
                              <span style={{ fontSize: 10.5, color: "var(--ink-2)" }}>{copiedCode === s.claim_code ? "Copied" : "Copy"}</span>
                            </button>
                          </td>
                          <td style={{ padding: "14px 0", textAlign: "right" }}>
                            {s.claimed_by ? <Status kind="pass">Claimed</Status> : <Status kind="muted">Unclaimed</Status>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </>
  );
}
