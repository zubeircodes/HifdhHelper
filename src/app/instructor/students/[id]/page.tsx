"use client";

import { useState, useEffect, use } from "react";
import { Avatar, IcoBack, Status } from "@/components/atoms";
import { createClient } from "@/lib/supabase";
import {
  loadSlotAssignments, itemLabel, statusKind, resultLabel, formatDate,
  type Assignment,
} from "@/lib/assignments";
import Link from "next/link";

interface StudentSlot {
  id: string;
  student_name: string;
  current_surah: string | null;
  current_verse: string | null;
  claimed_by: string | null;
  claim_code: string;
}

const RECENT = 5;

function getInitials(name: string): string {
  const parts = name.split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function InstructorStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [student, setStudent] = useState<StudentSlot | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data } = await supabase
        .from("student_slots")
        .select("id, student_name, current_surah, current_verse, claimed_by, claim_code")
        .eq("id", id)
        .single();
      if (data) setStudent(data);
      setAssignments(await loadSlotAssignments(supabase, id, 200));
      setLoading(false);
    })();
  }, [id]);

  if (loading || !student) {
    return (
      <div style={{ padding: "22px 36px" }}>
        <p style={{ color: "var(--ink-2)", fontSize: 13 }}>Loading...</p>
      </div>
    );
  }

  // Flatten to one row per item, newest first (assignments already newest first).
  const rows = assignments.flatMap((a) => a.items.map((it) => ({ a, it })));
  const graded = rows.filter((r) => r.it.evaluation);
  const pending = rows.filter((r) => !r.it.evaluation);
  const passed = graded.filter((r) => r.it.evaluation!.result === "pass").length;
  const visible = showAll ? graded : graded.slice(0, RECENT);
  const assignHref = `/instructor/assignments/new?student=${student.id}${assignments[0] ? `&from=${assignments[0].id}` : ""}`;

  return (
    <>
      <div style={{
        padding: "22px 36px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--rule-1)", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, color: "var(--ink-2)", fontSize: 12.5 }}>
          <Link href="/instructor" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "inherit", textDecoration: "none" }}>
            <IcoBack /> Roster
          </Link>
          <span>/</span>
          <span style={{ color: "var(--ink-0)" }}>{student.student_name}</span>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {pending.length > 0 && (
            <Link href={`/instructor/evaluate/${student.id}`} className="hh-btn ghost" style={{ textDecoration: "none" }}>
              Grade {pending.length === 1 ? "lesson" : `${pending.length} lessons`}
            </Link>
          )}
          <Link href={assignHref} className="hh-btn primary" style={{ textDecoration: "none" }}>
            Assign next lesson
          </Link>
        </div>
      </div>

      <div className="hh-page-padding" style={{ maxWidth: 920 }}>
        {/* Student header */}
        <div style={{ display: "flex", alignItems: "flex-start", gap: 28, paddingBottom: 32, borderBottom: "1px solid var(--rule-1)", flexWrap: "wrap" }}>
          <Avatar initials={getInitials(student.student_name)} size={64} tone="var(--paper-3)" />
          <div style={{ flex: 1, minWidth: 200 }}>
            <h1 className="hh-display" style={{ fontSize: 38, margin: "4px 0 4px" }}>{student.student_name}</h1>
            {student.current_surah && (
              <div className="hh-serif" style={{ fontSize: 14, fontStyle: "italic", color: "var(--ink-1)" }}>
                Currently on {student.current_surah} : {student.current_verse || "1"}
              </div>
            )}
            <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 8 }}>
              {student.claimed_by ? "Account linked" : `Not linked yet · class code ${student.claim_code}`}
            </div>
          </div>
          <div className="hh-instructor-stats" style={{ display: "flex", gap: 28 }}>
            <div>
              <div className="hh-eyebrow">Graded</div>
              <div className="hh-display hh-num" style={{ fontSize: 20, marginTop: 2 }}>{graded.length}</div>
            </div>
            <div>
              <div className="hh-eyebrow">Passed</div>
              <div className="hh-display hh-num" style={{ fontSize: 20, marginTop: 2, color: graded.length > 0 && passed === graded.length ? "var(--pass)" : undefined }}>
                {passed}
              </div>
            </div>
          </div>
        </div>

        {/* Pending */}
        {pending.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div className="hh-overline" style={{ marginBottom: 12 }}>Waiting to be graded</div>
            {pending.map(({ a, it }) => (
              <Link key={it.id} href={`/instructor/evaluate/${student.id}/${it.id}`}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "12px 14px", background: "var(--paper-3)", marginBottom: 4, textDecoration: "none", color: "inherit" }}>
                <span className="hh-num" style={{ fontSize: 11.5, color: "var(--ink-2)", width: 96, flexShrink: 0 }}>{formatDate(a.date)}</span>
                <span style={{ fontSize: 11, color: "var(--ink-2)", width: 90, flexShrink: 0, textTransform: "uppercase", letterSpacing: "0.04em" }}>{it.lesson_type_name}</span>
                <span className="hh-serif" style={{ fontSize: 14, flex: 1 }}>{itemLabel(it)}</span>
                {student.claimed_by && (
                  <span className="hh-num" style={{ fontSize: 11, color: "var(--ink-2)" }}>
                    {Math.min(it.listens, it.repetitions)}/{it.repetitions}
                  </span>
                )}
                <Status kind={it.submitted_at ? "pass" : "muted"}>{it.submitted_at ? "Ready" : "Grade"}</Status>
              </Link>
            ))}
          </div>
        )}

        {/* History */}
        <div style={{ marginTop: 36 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 12 }}>
            <div className="hh-overline">{showAll ? "All lessons" : "Recent lessons"}</div>
            {graded.length > RECENT && (
              <button onClick={() => setShowAll((v) => !v)}
                style={{ border: 0, background: "transparent", color: "var(--ink-1)", cursor: "pointer", fontSize: 12.5, textDecoration: "underline" }}>
                {showAll ? "Show recent" : `View all ${graded.length}`}
              </button>
            )}
          </div>

          {graded.length === 0 ? (
            <p style={{ color: "var(--ink-2)", fontSize: 13, lineHeight: 1.6 }}>
              {rows.length === 0
                ? <>No lessons yet. <Link href={assignHref}>Assign the first one</Link>.</>
                : "Nothing graded yet. Grades show here once you evaluate a lesson."}
            </p>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 520 }}>
                <thead>
                  <tr style={{ textAlign: "left", color: "var(--ink-2)", fontSize: 11, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                    <th style={{ padding: "8px 0", fontWeight: 500, width: 110 }}>Date</th>
                    <th style={{ padding: "8px 0", fontWeight: 500, width: 110 }}>Type</th>
                    <th style={{ padding: "8px 0", fontWeight: 500 }}>Range</th>
                    <th style={{ padding: "8px 0", fontWeight: 500, width: 90 }}>Result</th>
                    <th style={{ padding: "8px 0", fontWeight: 500 }}>Note</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map(({ a, it }) => (
                    <tr key={it.id} style={{ borderTop: "1px solid var(--rule-1)", verticalAlign: "top" }}>
                      <td className="hh-num" style={{ padding: "12px 12px 12px 0", fontSize: 12.5, color: "var(--ink-1)", whiteSpace: "nowrap" }}>{formatDate(a.date)}</td>
                      <td style={{ padding: "12px 12px 12px 0", fontSize: 12, color: "var(--ink-2)" }}>{it.lesson_type_name}</td>
                      <td style={{ padding: "12px 12px 12px 0" }}>
                        <Link href={`/instructor/evaluate/${student.id}/${it.id}`} className="hh-serif" style={{ fontSize: 13.5, color: "inherit", textDecoration: "none" }}>
                          {itemLabel(it)}
                        </Link>
                      </td>
                      <td style={{ padding: "12px 12px 12px 0" }}>
                        <Status kind={statusKind(it.evaluation!.result)}>{resultLabel(it.evaluation!.result)}</Status>
                      </td>
                      <td className="hh-serif" style={{ padding: "12px 0", fontSize: 12.5, color: "var(--ink-1)", lineHeight: 1.5 }}>
                        {it.evaluation!.note || <span style={{ color: "var(--ink-3)" }}>—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
