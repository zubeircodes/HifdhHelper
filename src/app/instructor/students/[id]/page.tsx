"use client";

import { useState, useEffect, use } from "react";
import { Eyebrow, Avatar, IcoBack } from "@/components/atoms";
import { createClient } from "@/lib/supabase";
import Link from "next/link";

interface StudentSlot {
  id: string;
  student_name: string;
  current_surah: string | null;
  current_verse: string | null;
  claimed_by: string | null;
  claim_code: string;
}

function getInitials(name: string): string {
  const parts = name.split(" ");
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : name.slice(0, 2).toUpperCase();
}

export default function InstructorStudentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [student, setStudent] = useState<StudentSlot | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();
    supabase.from("student_slots")
      .select("id, student_name, current_surah, current_verse, claimed_by, claim_code")
      .eq("id", id)
      .single()
      .then(({ data }) => {
        if (data) setStudent(data);
        setLoading(false);
      });
  }, [id]);

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
          <Link href="/instructor" style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "inherit", textDecoration: "none" }}>
            <IcoBack /> Roster
          </Link>
          <span>/</span>
          <span style={{ color: "var(--ink-0)" }}>{student.student_name}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <Link href={`/instructor/evaluate/${student.id}`} className="hh-btn primary" style={{ textDecoration: "none" }}>
            Evaluate today
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
              {student.claimed_by ? "Account linked" : `Unclaimed · Code: ${student.claim_code}`}
            </div>
          </div>
        </div>

        {/* Placeholder for assignments and evaluations */}
        <div style={{ marginTop: 36 }}>
          <div className="hh-overline" style={{ marginBottom: 16 }}>Assignments</div>
          <p style={{ color: "var(--ink-2)", fontSize: 13, lineHeight: 1.6 }}>
            Assignment history will appear here once you start assigning lessons to {student.student_name}.
          </p>
        </div>

        <div style={{ marginTop: 36 }}>
          <div className="hh-overline" style={{ marginBottom: 16 }}>Evaluations</div>
          <p style={{ color: "var(--ink-2)", fontSize: 13, lineHeight: 1.6 }}>
            Evaluation history will appear here once you evaluate {student.student_name}&apos;s lessons.
          </p>
        </div>
      </div>
    </>
  );
}
