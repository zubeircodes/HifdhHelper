"use client";

import { useState, useEffect } from "react";
import { Eyebrow, Avatar, Status, IcoPlus } from "@/components/atoms";
import { createClient } from "@/lib/supabase";
import { SURAHS } from "@/lib/quran-meta";
import Link from "next/link";

interface AssignmentRow {
  id: string;
  date: string;
  student_name: string;
  student_initials: string;
  items: {
    lesson_type_name: string;
    surah: number;
    start_ayah: number;
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

function getSurahName(num: number): string {
  return SURAHS.find((s) => s.number === num)?.name || `Surah ${num}`;
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

      // Get assignments with slot info
      const { data: rawAssignments } = await supabase
        .from("assignments")
        .select("id, date, student_slot_id, halaqa_id")
        .in("halaqa_id", halaqaIds)
        .order("date", { ascending: false })
        .limit(50);

      if (!rawAssignments || rawAssignments.length === 0) { setLoading(false); return; }

      // Get student names from slots
      const slotIds = rawAssignments.map((a) => a.student_slot_id).filter(Boolean);
      const { data: slots } = await supabase
        .from("student_slots")
        .select("id, student_name")
        .in("id", slotIds);

      const slotMap = new Map((slots || []).map((s) => [s.id, s.student_name]));

      // Get assignment items + evaluations
      const assignmentIds = rawAssignments.map((a) => a.id);
      const { data: items } = await supabase
        .from("assignment_items")
        .select("id, assignment_id, lesson_type_id, surah, start_ayah, end_ayah")
        .in("assignment_id", assignmentIds);

      // Get lesson type names
      const { data: types } = await supabase
        .from("lesson_types")
        .select("id, name")
        .eq("instructor_id", user.id);

      const typeMap = new Map((types || []).map((t) => [t.id, t.name]));

      // Get evaluations
      const itemIds = (items || []).map((i) => i.id);
      const { data: evals } = itemIds.length > 0
        ? await supabase.from("evaluations").select("assignment_item_id, result").in("assignment_item_id", itemIds)
        : { data: [] };

      const evalMap = new Map((evals || []).map((e) => [e.assignment_item_id, e.result]));

      // Build rows
      const rows: AssignmentRow[] = rawAssignments.map((a) => {
        const studentName = slotMap.get(a.student_slot_id) || "Unknown";
        const assignmentItems = (items || [])
          .filter((i) => i.assignment_id === a.id)
          .map((i) => ({
            lesson_type_name: typeMap.get(i.lesson_type_id) || "Unknown",
            surah: i.surah,
            start_ayah: i.start_ayah,
            end_ayah: i.end_ayah,
            eval_result: evalMap.get(i.id) || null,
          }));

        return {
          id: a.id,
          date: a.date,
          student_name: studentName,
          student_initials: getInitials(studentName),
          items: assignmentItems,
        };
      });

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
                      <td style={{ padding: "14px 0", fontSize: 12.5, color: "var(--ink-2)" }} className="hh-num">
                        {a.date}
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
                            <span className="hh-serif">{getSurahName(item.surah)} {item.surah}:{item.start_ayah}–{item.end_ayah}</span>
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
