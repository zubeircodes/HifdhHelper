"use client";

import { useState, useEffect } from "react";
import { Eyebrow, Avatar, Status } from "@/components/atoms";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

interface StudentSlot {
  id: string;
  student_name: string;
  current_surah: string | null;
  current_verse: string | null;
  claimed_by: string | null;
  pending: number;
}

function getInitials(name: string): string {
  const parts = name.split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function EvaluateList() {
  const [students, setStudents] = useState<StudentSlot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return;

      const { data: halaqat } = await supabase
        .from("halaqat")
        .select("id")
        .eq("instructor_id", user.id);

      if (halaqat && halaqat.length > 0) {
        const halaqaIds = halaqat.map((h) => h.id);
        const { data: slots } = await supabase
          .from("student_slots")
          .select("id, student_name, current_surah, current_verse, claimed_by")
          .in("halaqa_id", halaqaIds)
          .order("student_name", { ascending: true });

        if (slots) {
          // Count ungraded items per slot in one query.
          const { data: items } = await supabase
            .from("assignment_items")
            .select("id, assignments!inner(student_slot_id), evaluations(result)")
            .in("assignments.student_slot_id", slots.map((s) => s.id));
          const pending = new Map<string, number>();
          /* eslint-disable @typescript-eslint/no-explicit-any */
          for (const it of (items || []) as any[]) {
            const ev = Array.isArray(it.evaluations) ? it.evaluations[0] : it.evaluations;
            if (ev) continue;
            const a = Array.isArray(it.assignments) ? it.assignments[0] : it.assignments;
            const sid = a?.student_slot_id;
            if (sid) pending.set(sid, (pending.get(sid) || 0) + 1);
          }
          /* eslint-enable @typescript-eslint/no-explicit-any */
          setStudents(slots.map((s) => ({ ...s, pending: pending.get(s.id) || 0 })));
        }
      }
      setLoading(false);
    });
  }, []);

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
        borderBottom: "1px solid var(--rule-1)",
      }}>
        <div>
          <Eyebrow>Teaching</Eyebrow>
          <h1 className="hh-display" style={{ fontSize: 24, margin: "6px 0 0" }}>
            Evaluations
          </h1>
        </div>
      </div>

      <div className="hh-page-padding" style={{ maxWidth: 640 }}>
        {students.length === 0 ? (
          <p style={{ color: "var(--ink-2)", fontSize: 13, padding: "32px 0", textAlign: "center" }}>
            No students yet. <Link href="/instructor/classes">Add one in Classes</Link>.
          </p>
        ) : (
          <>
            <p style={{ color: "var(--ink-2)", fontSize: 13, lineHeight: 1.6, margin: "0 0 24px" }}>
              Pick a student to grade their latest lesson.
            </p>

            <div className="hh-overline" style={{ marginBottom: 14 }}>Students</div>

            {students.map((s) => (
              <Link
                key={s.id}
                href={`/instructor/evaluate/${s.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: 14,
                  padding: "14px 0",
                  borderTop: "1px solid var(--rule-1)",
                  textDecoration: "none", color: "inherit",
                }}
              >
                <Avatar initials={getInitials(s.student_name)} size={32} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 500 }}>{s.student_name}</div>
                  <div className="hh-serif" style={{ fontSize: 12.5, color: "var(--ink-2)", marginTop: 1 }}>
                    {s.current_surah ? `${s.current_surah} : ${s.current_verse || "1"}` : "No lesson assigned"}
                  </div>
                </div>
                <Status kind={s.pending > 0 ? "partial" : "muted"}>
                  {s.pending > 0 ? `${s.pending} to grade` : "Up to date"}
                </Status>
              </Link>
            ))}
          </>
        )}
      </div>
    </>
  );
}
