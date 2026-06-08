"use client";

import { useState, useEffect, use } from "react";
import { Eyebrow, Avatar, IcoBack, IcoFwd, Status } from "@/components/atoms";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

interface StudentSlot {
  id: string;
  student_name: string;
  current_surah: string | null;
  current_verse: string | null;
  claimed_by: string | null;
}

interface LessonType {
  id: string;
  name: string;
  description: string | null;
}

interface EvalStatus {
  lesson_type_id: string;
  result: "pass" | "partial" | "fail" | null;
}

function getInitials(name: string): string {
  const parts = name.split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function EvaluateStudentLessons({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [student, setStudent] = useState<StudentSlot | null>(null);
  const [categories, setCategories] = useState<LessonType[]>([]);
  const [evalStatuses, setEvalStatuses] = useState<EvalStatus[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      // Get student slot
      const { data: slot } = await supabase
        .from("student_slots")
        .select("id, student_name, current_surah, current_verse, claimed_by")
        .eq("id", id)
        .single();

      if (slot) setStudent(slot);

      // Get lesson types
      const { data: types } = await supabase
        .from("lesson_types")
        .select("id, name, description")
        .eq("instructor_id", user.id)
        .eq("is_active", true)
        .order("sort_order", { ascending: true });

      if (types) setCategories(types);

      // Get today's evaluation statuses
      if (slot) {
        const today = new Date().toISOString().split("T")[0];

        const { data: assignments } = await supabase
          .from("assignments")
          .select("id")
          .eq("student_slot_id", slot.id)
          .eq("date", today)
          .limit(1);

        if (assignments && assignments.length > 0) {
          const { data: items } = await supabase
            .from("assignment_items")
            .select("id, lesson_type_id")
            .eq("assignment_id", assignments[0].id);

          if (items && items.length > 0) {
            const itemIds = items.map((i) => i.id);
            const { data: evals } = await supabase
              .from("evaluations")
              .select("assignment_item_id, result")
              .in("assignment_item_id", itemIds);

            if (evals) {
              const statuses: EvalStatus[] = items.map((item) => {
                const ev = evals.find((e) => e.assignment_item_id === item.id);
                return {
                  lesson_type_id: item.lesson_type_id,
                  result: ev ? (ev.result as "pass" | "partial" | "fail") : null,
                };
              });
              setEvalStatuses(statuses);
            }
          }
        }
      }

      setLoading(false);
    });
  }, [id]);

  function getEvalStatus(lessonTypeId: string): EvalStatus | undefined {
    return evalStatuses.find((e) => e.lesson_type_id === lessonTypeId);
  }

  if (loading || !student) {
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
          <Link href="/instructor/evaluate" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "inherit", textDecoration: "none" }}>
            <IcoBack /> Evaluations
          </Link>
          <span>/</span>
          <span style={{ color: "var(--ink-0)" }}>{student.student_name}</span>
        </div>
      </div>

      <div className="hh-page-padding" style={{ maxWidth: 640 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 32 }}>
          <Avatar initials={getInitials(student.student_name)} size={48} tone="var(--paper-3)" />
          <div>
            <h1 className="hh-display" style={{ fontSize: 26, margin: 0 }}>{student.student_name}</h1>
            <div className="hh-serif" style={{ fontSize: 13, color: "var(--ink-2)", fontStyle: "italic", marginTop: 2 }}>
              {student.current_surah ? `${student.current_surah} : ${student.current_verse || "1"}` : "No lesson assigned"}
            </div>
          </div>
        </div>

        <div className="hh-overline" style={{ marginBottom: 14 }}>Lesson categories</div>

        {categories.length === 0 ? (
          <p style={{ color: "var(--ink-2)", fontSize: 13, padding: "16px 0" }}>
            No lesson categories set up yet. Add them from the Settings tab.
          </p>
        ) : (
          <>
            <p style={{ color: "var(--ink-2)", fontSize: 12.5, margin: "0 0 20px" }}>
              Evaluate each lesson individually.
            </p>
            {categories.map((c, i) => {
              const evalStatus = getEvalStatus(c.id);
              return (
                <Link
                  key={c.id}
                  href={`/instructor/evaluate/${id}/${c.id}`}
                  style={{
                    display: "flex", alignItems: "center", gap: 16,
                    padding: "18px 0",
                    borderTop: i === 0 ? "none" : "1px solid var(--rule-1)",
                    textDecoration: "none", color: "inherit",
                  }}
                >
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "baseline", gap: 10, marginBottom: 4 }}>
                      <span className="hh-serif" style={{ fontSize: 16, fontWeight: 500 }}>{c.name}</span>
                      {c.description && <span style={{ fontSize: 11, color: "var(--ink-2)" }}>{c.description}</span>}
                    </div>
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {evalStatus?.result ? (
                      <Status kind={evalStatus.result}>{evalStatus.result}</Status>
                    ) : (
                      <Status kind="muted">Pending</Status>
                    )}
                    <IcoFwd s={12} />
                  </div>
                </Link>
              );
            })}
          </>
        )}

        <hr className="hh-rule" style={{ margin: "24px 0" }} />
        <div style={{ display: "flex", justifyContent: "flex-end" }}>
          <Link href="/instructor/evaluate" className="hh-btn ghost" style={{ textDecoration: "none" }}>
            Back to student list
          </Link>
        </div>
      </div>
    </>
  );
}
