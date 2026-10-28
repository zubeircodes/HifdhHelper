"use client";

import { useState, useEffect, use, Suspense } from "react";
import { Avatar, IcoBack, IcoFwd, Status } from "@/components/atoms";
import { createClient } from "@/lib/supabase";
import {
  loadSlotAssignments, pickPending, itemLabel, statusKind, resultLabel, formatDate,
  type Assignment,
} from "@/lib/assignments";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

interface StudentSlot {
  id: string;
  student_name: string;
  claimed_by: string | null;
}

function getInitials(name: string): string {
  const parts = name.split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

function EvaluateStudent({ id }: { id: string }) {
  const params = useSearchParams();
  const wanted = params.get("assignment");

  const [student, setStudent] = useState<StudentSlot | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: slot } = await supabase
        .from("student_slots")
        .select("id, student_name, claimed_by")
        .eq("id", id)
        .single();
      if (slot) setStudent(slot);

      const all = await loadSlotAssignments(supabase, id, 20);
      const chosen = (wanted && all.find((a) => a.id === wanted)) || pickPending(all);
      setAssignment(chosen);
      setLoading(false);
    })();
  }, [id, wanted]);

  if (loading || !student) {
    return (
      <div style={{ padding: "22px 36px" }}>
        <p style={{ color: "var(--ink-2)", fontSize: 13 }}>Loading...</p>
      </div>
    );
  }

  const allGraded = !!assignment && assignment.items.length > 0 && assignment.items.every((i) => i.evaluation);
  const assignHref = `/instructor/assignments/new?student=${student.id}`;

  return (
    <>
      <div style={{
        padding: "22px 36px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        borderBottom: "1px solid var(--rule-1)", flexWrap: "wrap", gap: 12,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, color: "var(--ink-2)", fontSize: 12.5 }}>
          <Link href="/instructor/evaluate" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "inherit", textDecoration: "none" }}>
            <IcoBack /> Evaluations
          </Link>
          <span>/</span>
          <span style={{ color: "var(--ink-0)" }}>{student.student_name}</span>
        </div>
        <Link href={assignHref} className={`hh-btn ${allGraded || !assignment ? "primary" : "ghost"}`} style={{ textDecoration: "none" }}>
          Assign next lesson
        </Link>
      </div>

      <div className="hh-page-padding" style={{ maxWidth: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <Avatar initials={getInitials(student.student_name)} size={48} tone="var(--paper-3)" />
          <div>
            <h1 className="hh-display" style={{ fontSize: 26, margin: 0 }}>
              <Link href={`/instructor/students/${student.id}`} style={{ color: "inherit", textDecoration: "none" }}>
                {student.student_name}
              </Link>
            </h1>
            <div className="hh-serif" style={{ fontSize: 13, color: "var(--ink-2)", fontStyle: "italic", marginTop: 2 }}>
              {assignment ? `Lesson for ${formatDate(assignment.date)}` : "No lesson assigned yet"}
            </div>
          </div>
        </div>

        {!assignment ? (
          <div style={{ padding: "24px 0" }}>
            <p style={{ color: "var(--ink-2)", fontSize: 13, margin: "0 0 12px" }}>
              Nothing to grade. Assign a lesson and come back on class day.
            </p>
            <Link href={assignHref} className="hh-btn primary" style={{ textDecoration: "none" }}>Assign a lesson</Link>
          </div>
        ) : (
          <>
            <div className="hh-overline" style={{ marginBottom: 14 }}>
              {allGraded ? "All graded" : "Tap a lesson to grade it"}
            </div>
            {assignment.items.map((it, i) => (
              <Link
                key={it.id}
                href={`/instructor/evaluate/${id}/${it.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: 16,
                  padding: "18px 0",
                  borderTop: i === 0 ? "none" : "1px solid var(--rule-1)",
                  textDecoration: "none", color: "inherit",
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 11, color: "var(--ink-2)", letterSpacing: "0.04em", textTransform: "uppercase", marginBottom: 4 }}>
                    {it.lesson_type_name} · ×{it.repetitions}
                  </div>
                  <div className="hh-serif" style={{ fontSize: 16, fontWeight: 500 }}>{itemLabel(it)}</div>
                  {it.evaluation?.note && (
                    <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 4, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {it.evaluation.note}
                    </div>
                  )}
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Status kind={statusKind(it.evaluation?.result)}>{resultLabel(it.evaluation?.result)}</Status>
                  <IcoFwd s={12} />
                </div>
              </Link>
            ))}

            {allGraded && (
              <div style={{ marginTop: 28, padding: "20px 22px", background: "var(--paper-3)", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
                <span className="hh-serif" style={{ fontSize: 14 }}>Done for {formatDate(assignment.date)}. Set the next lesson?</span>
                <Link href={assignHref} className="hh-btn primary" style={{ textDecoration: "none" }}>Assign next lesson</Link>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

export default function EvaluateStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={<div style={{ padding: "22px 36px" }}><p style={{ color: "var(--ink-2)", fontSize: 13 }}>Loading...</p></div>}>
      <EvaluateStudent id={id} />
    </Suspense>
  );
}
