"use client";

import { useState, useEffect } from "react";
import { Eyebrow, Avatar, Status, IcoPlus } from "@/components/atoms";
import { createClient } from "@/lib/supabase";
import { rangeLabel } from "@/lib/quran-meta";
import { formatDate } from "@/lib/assignments";
import Link from "next/link";

interface AssignmentRow {
  id: string;
  date: string;
  student_slot_id: string;
  student_name: string;
  student_initials: string;
  items: {
    lesson_type_name: string;
    surah: number;
    start_ayah: number;
    end_surah: number;
    end_ayah: number;
    eval_result: string | null;
  }[];
}

function getInitials(name: string): string {
  const parts = name.split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      // Get instructor's halaqat
      const { data: halaqat } = await supabase
        .from("halaqat")
        .select("id")
        .eq("instructor_id", user.id);

      if (!halaqat || halaqat.length === 0) { setLoading(false); return; }

      const halaqaIds = halaqat.map((h) => h.id);

      // One nested query: assignments → slot name, items → type + evaluation.
      const { data: raw } = await supabase
        .from("assignments")
        .select("id, date, student_slot_id, student_slots(student_name), assignment_items(id, surah, start_ayah, end_surah, end_ayah, lesson_types(name), evaluations(result))")
        .in("halaqa_id", halaqaIds)
        .not("student_slot_id", "is", null)
        .order("date", { ascending: false })
        .limit(100);

      /* eslint-disable @typescript-eslint/no-explicit-any */
      const one = (v: any) => (Array.isArray(v) ? v[0] : v);
      const rows: AssignmentRow[] = ((raw || []) as any[]).map((a) => {
        const studentName = one(a.student_slots)?.student_name || "Unknown";
        return {
          id: a.id,
          date: a.date,
          student_slot_id: a.student_slot_id,
          student_name: studentName,
          student_initials: getInitials(studentName),
          items: (a.assignment_items || [])
            .map((i: any) => ({
              lesson_type_name: one(i.lesson_types)?.name || "Lesson",
              surah: i.surah,
              start_ayah: i.start_ayah,
              end_surah: i.end_surah ?? i.surah,
              end_ayah: i.end_ayah,
              eval_result: one(i.evaluations)?.result || null,
            }))
            .sort((x: any, y: any) => x.surah - y.surah || x.start_ayah - y.start_ayah),
        };
      });
      /* eslint-enable @typescript-eslint/no-explicit-any */

      setAssignments(rows);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return <div style={{ padding: "22px 36px" }}><p style={{ color: "var(--ink-2)", fontSize: 13 }}>Loading...</p></div>;
  }

  return (
    <>
      <div style={{
        padding: "22px 36px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--rule-1)",
      }}>
        <div>
          <Eyebrow>Teaching</Eyebrow>
          <h1 className="hh-display" style={{ fontSize: 24, margin: "6px 0 0" }}>Assignments</h1>
        </div>
        <Link href="/instructor/assignments/new" className="hh-btn primary" style={{ textDecoration: "none" }}>
          <IcoPlus /> New assignment
        </Link>
      </div>

      <div className="hh-page-padding" style={{ maxWidth: 800 }}>
        {assignments.length === 0 ? (
          <div style={{ padding: "32px 0", textAlign: "center" }}>
            <p style={{ color: "var(--ink-2)", fontSize: 13, margin: "0 0 16px" }}>
              No assignments yet. Create one to get started.
            </p>
            <Link href="/instructor/assignments/new" className="hh-btn primary" style={{ textDecoration: "none" }}>
              <IcoPlus /> New assignment
            </Link>
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 500 }}>
              <thead>
                <tr style={{ textAlign: "left", color: "var(--ink-2)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                  <th style={{ padding: "10px 0", fontWeight: 500, width: "15%" }}>Date</th>
                  <th style={{ padding: "10px 0", fontWeight: 500, width: "25%" }}>Student</th>
                  <th style={{ padding: "10px 0", fontWeight: 500, width: "40%" }}>Lessons</th>
                  <th style={{ padding: "10px 0", fontWeight: 500, width: "20%", textAlign: "right" }}>Result</th>
                </tr>
              </thead>
              <tbody>
                {assignments.map((a) => {
                  const passed = a.items.filter((i) => i.eval_result === "pass").length;
                  const evaluated = a.items.filter((i) => i.eval_result).length;
                  return (
                    <tr key={a.id} style={{ borderTop: "1px solid var(--rule-1)" }}>
                      <td style={{ padding: "14px 0", fontSize: 12.5, color: "var(--ink-2)", whiteSpace: "nowrap" }} className="hh-num">
                        <Link href={`/instructor/evaluate/${a.student_slot_id}?assignment=${a.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                          {formatDate(a.date)}
                        </Link>
                      </td>
                      <td style={{ padding: "14px 0" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <Avatar initials={a.student_initials} size={24} />
                          <span style={{ fontSize: 13, fontWeight: 500 }}>{a.student_name}</span>
                        </div>
                      </td>
                      <td style={{ padding: "14px 0" }}>
                        {a.items.map((item, i) => (
                          <div key={i} style={{ fontSize: 12.5, color: "var(--ink-1)", marginTop: i > 0 ? 4 : 0 }}>
                            <span style={{ color: "var(--ink-2)" }}>{item.lesson_type_name}:</span>{" "}
                            <span className="hh-serif">{rangeLabel({ surah: item.surah, startAyah: item.start_ayah, endSurah: item.end_surah, endAyah: item.end_ayah })}</span>
                          </div>
                        ))}
                      </td>
                      <td style={{ padding: "14px 0", textAlign: "right" }}>
                        {evaluated === 0 ? (
                          <Status kind="muted">Pending</Status>
                        ) : passed === a.items.length ? (
                          <Status kind="pass">{passed}/{a.items.length} passed</Status>
                        ) : (
                          <Status kind="partial">{passed}/{a.items.length} passed</Status>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
