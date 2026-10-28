"use client";

import { useState, useEffect } from "react";
import { Eyebrow, Avatar, Status } from "@/components/atoms";
import { createClient } from "@/lib/supabase";
import { formatDate, normalizeItem, ITEM_FIELDS, type Assignment } from "@/lib/assignments";
import Link from "next/link";

interface StudentSlot {
  id: string;
  student_name: string;
  current_surah: string | null;
  current_verse: string | null;
  claimed_by: string | null;
  halaqa_id: string;
  latest: Assignment | null;
}

interface Halaqa {
  id: string;
  name: string;
}

function getInitials(name: string): string {
  const parts = name.split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function InstructorDashboard() {
  const [students, setStudents] = useState<StudentSlot[]>([]);
  const [classes, setClasses] = useState<Halaqa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterClass, setFilterClass] = useState<string>("all");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const { data: halaqat } = await supabase
        .from("halaqat")
        .select("id, name")
        .eq("instructor_id", user.id)
        .order("created_at", { ascending: true });

      if (halaqat && halaqat.length > 0) {
        setClasses(halaqat);

        const halaqaIds = halaqat.map((h) => h.id);
        const { data: slots } = await supabase
          .from("student_slots")
          .select("*")
          .in("halaqa_id", halaqaIds)
          .order("student_name", { ascending: true });

        if (slots) {
          // One query for every slot's assignments, newest first; keep the
          // latest per slot. Replaces 4 round trips per student.
          const { data: rows } = await supabase
            .from("assignments")
            .select(`id, date, student_slot_id, assignment_items(${ITEM_FIELDS})`)
            .in("student_slot_id", slots.map((s) => s.id))
            .order("date", { ascending: false })
            .limit(1000);

          const latestBySlot = new Map<string, Assignment>();
          /* eslint-disable @typescript-eslint/no-explicit-any */
          for (const r of (rows || []) as any[]) {
            if (latestBySlot.has(r.student_slot_id)) continue;
            latestBySlot.set(r.student_slot_id, {
              id: r.id,
              date: r.date,
              items: (r.assignment_items || []).map(normalizeItem),
            });
          }
          /* eslint-enable @typescript-eslint/no-explicit-any */

          setStudents(slots.map((slot) => ({ ...slot, latest: latestBySlot.get(slot.id) ?? null })));
        }
      }
      setLoading(false);
    });
  }, []);

  const filteredStudents = filterClass === "all"
    ? students
    : students.filter((s) => s.halaqa_id === filterClass);

  function getClassName(halaqaId: string): string {
    return classes.find((c) => c.id === halaqaId)?.name || "";
  }

  if (loading) {
    return <div style={{ padding: "22px 36px" }}><p style={{ color: "var(--ink-2)", fontSize: 13 }}>Loading...</p></div>;
  }

  return (
    <>
      <div style={{
        padding: "22px 36px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--rule-1)", flexWrap: "wrap", gap: 16,
      }}>
        <div>
          <Eyebrow>Teaching</Eyebrow>
          <h1 className="hh-display" style={{ fontSize: 24, margin: "6px 0 0" }}>Students</h1>
        </div>
        <div className="hh-instructor-stats" style={{ display: "flex", gap: 32 }}>
          <div>
            <div className="hh-eyebrow">Total</div>
            <div className="hh-display hh-num" style={{ fontSize: 20, marginTop: 2 }}>{students.length}</div>
          </div>
          <div>
            <div className="hh-eyebrow">Linked</div>
            <div className="hh-display hh-num" style={{ fontSize: 20, marginTop: 2 }}>{students.filter((s) => s.claimed_by).length}</div>
          </div>
        </div>
      </div>

      <div className="hh-page-padding" style={{ maxWidth: 920 }}>
        {/* Class filter */}
        {classes.length > 1 && (
          <div style={{ marginBottom: 20, display: "flex", gap: 1, background: "var(--rule-1)", border: "1px solid var(--rule-1)", maxWidth: 500 }}>
            <button onClick={() => setFilterClass("all")}
              style={{
                flex: 1, padding: "8px 12px", border: 0, cursor: "pointer",
                background: filterClass === "all" ? "var(--paper-2)" : "var(--paper-1)",
                color: filterClass === "all" ? "var(--ink-0)" : "var(--ink-1)",
                fontWeight: filterClass === "all" ? 500 : 400, fontSize: 12.5,
              }}>All</button>
            {classes.map((c) => (
              <button key={c.id} onClick={() => setFilterClass(c.id)}
                style={{
                  flex: 1, padding: "8px 12px", border: 0, cursor: "pointer",
                  background: filterClass === c.id ? "var(--paper-2)" : "var(--paper-1)",
                  color: filterClass === c.id ? "var(--ink-0)" : "var(--ink-1)",
                  fontWeight: filterClass === c.id ? 500 : 400, fontSize: 12.5,
                }}>{c.name}</button>
            ))}
          </div>
        )}

        {students.length === 0 ? (
          <div style={{ padding: "40px 0", textAlign: "center" }}>
            <p className="hh-serif" style={{ color: "var(--ink-0)", fontSize: 17, margin: "0 0 6px" }}>
              {classes.length === 0 ? "Start with a class" : "Now add your students"}
            </p>
            <p style={{ color: "var(--ink-2)", fontSize: 12.5, margin: "0 0 18px" }}>
              {classes.length === 0
                ? "Create a class, add students by name, and give each one their code."
                : "Each student gets a code to link their own account — or just keep records here."}
            </p>
            <Link href="/instructor/classes" className="hh-btn primary" style={{ textDecoration: "none" }}>
              {classes.length === 0 ? "Create a class" : "Add students"}
            </Link>
          </div>
        ) : filteredStudents.length === 0 ? (
          <p style={{ color: "var(--ink-2)", fontSize: 13, padding: "32px 0", textAlign: "center" }}>No students in this class.</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 450 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--ink-2)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  <th style={{ padding: "10px 0", fontWeight: 500, width: "30%" }}>Student</th>
                  <th style={{ padding: "10px 0", fontWeight: 500, width: "30%" }}>Current lesson</th>
                  <th style={{ padding: "10px 0", fontWeight: 500, width: "22%" }}>Last lesson</th>
                  {classes.length > 1 && (
                    <th style={{ padding: "10px 0", fontWeight: 500, width: "15%" }}>Class</th>
                  )}
                  <th style={{ padding: "10px 0", fontWeight: 500, textAlign: "right" }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.map((s) => (
                  <tr key={s.id} style={{ borderTop: "1px solid var(--rule-1)", cursor: "pointer" }}>
                    <td style={{ padding: "16px 0" }}>
                      <Link href={`/instructor/students/${s.id}`}
                        style={{ display: "flex", alignItems: "center", gap: 12, textDecoration: "none", color: "inherit" }}>
                        <Avatar initials={getInitials(s.student_name)} size={28} />
                        <div style={{ fontSize: 13.5, fontWeight: 500 }}>{s.student_name}</div>
                      </Link>
                    </td>
                    <td style={{ padding: "16px 0", color: "var(--ink-1)", fontSize: 13 }} className="hh-serif">
                      {s.current_surah ? `${s.current_surah} : ${s.current_verse || "1"}` : "—"}
                    </td>
                    <td style={{ padding: "16px 0", fontSize: 12.5 }}>
                      {s.latest ? (() => {
                        const total = s.latest.items.length;
                        const graded = s.latest.items.filter((i) => i.evaluation).length;
                        const passed = s.latest.items.filter((i) => i.evaluation?.result === "pass").length;
                        const done = total > 0 && graded === total;
                        return (
                          <Link href={`/instructor/evaluate/${s.id}?assignment=${s.latest.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                            <span className="hh-num" style={{ color: "var(--ink-1)" }}>{formatDate(s.latest.date)}</span>
                            <span style={{ display: "block", fontSize: 11, marginTop: 2, color: done ? (passed === total ? "var(--pass)" : "var(--ink-2)") : "var(--ink-2)" }}>
                              {done ? `${passed}/${total} passed` : `${graded}/${total} graded`}
                            </span>
                          </Link>
                        );
                      })() : (
                        <span style={{ color: "var(--ink-3)" }}>—</span>
                      )}
                    </td>
                    {classes.length > 1 && (
                      <td style={{ padding: "16px 0", fontSize: 12, color: "var(--ink-2)" }}>
                        {getClassName(s.halaqa_id)}
                      </td>
                    )}
                    <td style={{ padding: "16px 0", textAlign: "right" }}>
                      {s.claimed_by ? (
                        <Status kind="pass">Linked</Status>
                      ) : (
                        <Status kind="muted">Not linked</Status>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
