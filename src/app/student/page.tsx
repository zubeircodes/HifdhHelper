"use client";

import { useState, useEffect } from "react";
import { Eyebrow, Avatar, IcoFwd, Status } from "@/components/atoms";
import { createClient } from "@/lib/supabase";
import { loadMyAssignments, itemLabel, statusKind, resultLabel, formatDate, type Assignment } from "@/lib/assignments";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function StudentDashboard() {
  const [user, setUser] = useState<{ display_name: string; initials: string } | null>(null);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) {
        router.push("/login");
        return;
      }

      const name = user.user_metadata?.display_name || user.email?.split("@")[0] || "Student";
      const parts = name.split(" ");
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();

      setUser({ display_name: name.split(" ")[0], initials });

      // Check enrollment
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("id")
        .eq("student_id", user.id)
        .eq("is_active", true)
        .limit(1);

      const isEnrolled = !!(enrollments && enrollments.length > 0);
      setEnrolled(isEnrolled);
      if (isEnrolled) setAssignments(await loadMyAssignments(supabase, user.id, 10));
      setLoading(false);
    });
  }, [router]);

  if (loading) {
    return (
      <div style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--ink-2)", fontSize: 13 }}>Loading...</p>
      </div>
    );
  }

  if (!enrolled) {
    // Not enrolled — show join prompt
    return (
      <div style={{ padding: "16px 22px 20px", flex: "1 1 auto", display: "flex", flexDirection: "column" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <Eyebrow>{new Date().toLocaleDateString(undefined, { weekday: "long" })}</Eyebrow>
            <div className="hh-display" style={{ fontSize: 26, marginTop: 6 }}>
              <span style={{ fontStyle: "italic" }}>As-salām</span>
              <br />
              ʿalaykum, {user?.display_name}.
            </div>
          </div>
          <Avatar initials={user?.initials || "??"} size={32} />
        </div>

        <div style={{ marginTop: 36, padding: "24px 22px", background: "var(--paper-3)", textAlign: "center" }}>
          <Eyebrow>No class yet</Eyebrow>
          <p className="hh-serif" style={{ fontSize: 17, margin: "10px 0 6px", color: "var(--ink-0)" }}>
            Join your teacher&apos;s class to start receiving lessons
          </p>
          <p style={{ fontSize: 12, color: "var(--ink-2)", margin: "0 0 20px" }}>
            Enter the code your teacher gave you.
          </p>
          <Link href="/student/join" className="hh-btn primary" style={{ textDecoration: "none" }}>
            Enter class code
          </Link>
        </div>

        <div style={{ marginTop: 32 }}>
          <div className="hh-overline" style={{ marginBottom: 12 }}>In the meantime</div>
          <Link
            href="/student/practice"
            style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 0", borderTop: "1px solid var(--rule-1)",
              textDecoration: "none", color: "inherit",
            }}
          >
            <div>
              <div className="hh-serif" style={{ fontSize: 15 }}>Practice mode</div>
              <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 2 }}>
                Listen to any surah and verse range freely
              </div>
            </div>
            <IcoFwd s={12} />
          </Link>
        </div>
      </div>
    );
  }

  // Enrolled — show the current lesson from the teacher
  const current = assignments.find((a) => a.items.some((i) => !i.evaluation)) ?? assignments[0] ?? null;
  const pendingItems = current ? current.items.filter((i) => !i.evaluation) : [];
  const lastNote = assignments
    .flatMap((a) => a.items.map((i) => ({ date: a.date, it: i })))
    .find((r) => r.it.evaluation?.note);
  const recent = assignments
    .flatMap((a) => a.items.filter((i) => i.evaluation).map((i) => ({ date: a.date, it: i })))
    .slice(0, 5);

  return (
    <div style={{ padding: "16px 22px 20px", flex: "1 1 auto", overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <Eyebrow>{new Date().toLocaleDateString(undefined, { weekday: "long" })}</Eyebrow>
          <div className="hh-display" style={{ fontSize: 26, marginTop: 6 }}>
            <span style={{ fontStyle: "italic" }}>As-salām</span>
            <br />
            ʿalaykum, {user?.display_name}.
          </div>
        </div>
        <Avatar initials={user?.initials || "??"} size={32} />
      </div>

      {!current ? (
        <div style={{ marginTop: 36, padding: "24px 22px", background: "var(--paper-3)", textAlign: "center" }}>
          <Eyebrow>No lesson yet</Eyebrow>
          <p className="hh-serif" style={{ fontSize: 16, margin: "10px 0 0", color: "var(--ink-0)" }}>
            Your teacher hasn&apos;t assigned anything yet. Try practice mode meanwhile.
          </p>
        </div>
      ) : pendingItems.length === 0 ? (
        <div style={{ marginTop: 36, padding: "24px 22px", background: "var(--paper-3)", textAlign: "center" }}>
          <Eyebrow>All graded</Eyebrow>
          <p className="hh-serif" style={{ fontSize: 16, margin: "10px 0 0", color: "var(--ink-0)" }}>
            Nothing new yet — your teacher will assign the next lesson.
          </p>
        </div>
      ) : (
        <div style={{ marginTop: 32 }}>
          <div className="hh-overline" style={{ marginBottom: 12 }}>Lesson for {formatDate(current.date)}</div>
          {pendingItems.map((it, i) => {
            const done = Math.min(it.listens, it.repetitions);
            const ready = !!it.submitted_at;
            return (
              <Link key={it.id} href={`/student/player?item=${it.id}`}
                style={{ display: "block", padding: i === 0 ? "0 0 18px" : "18px 0", borderTop: i === 0 ? "none" : "1px solid var(--rule-1)", textDecoration: "none", color: "inherit" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 12 }}>
                  <div style={{ minWidth: 0 }}>
                    <div className="hh-eyebrow" style={{ marginBottom: 4 }}>{it.lesson_type_name} · repeat ×{it.repetitions}</div>
                    <div className="hh-serif" style={{ fontSize: i === 0 ? 20 : 15, lineHeight: 1.3 }}>{itemLabel(it)}</div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    {ready ? (
                      <Status kind="pass">Ready</Status>
                    ) : (
                      <>
                        <div className="hh-display hh-num" style={{ fontSize: 18, lineHeight: 1 }}>
                          {done}<span style={{ fontSize: 12, color: "var(--ink-2)" }}>/{it.repetitions}</span>
                        </div>
                        <div style={{ fontSize: 10.5, color: "var(--ink-2)", marginTop: 2 }}>listens</div>
                      </>
                    )}
                  </div>
                </div>
                {i === 0 && !ready && (
                  <span className="hh-btn primary lg" style={{ marginTop: 18, width: "100%", justifyContent: "center", display: "inline-flex" }}>
                    {done === 0 ? "Begin listening" : "Keep going"}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      )}

      {lastNote && (
        <div style={{ marginTop: 36, padding: "18px 0", borderTop: "1px solid var(--rule-1)" }}>
          <div className="hh-eyebrow" style={{ marginBottom: 8 }}>From your teacher · {formatDate(lastNote.date)}</div>
          <p className="hh-serif" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-1)", margin: 0, fontStyle: "italic" }}>
            &ldquo;{lastNote.it.evaluation!.note}&rdquo;
          </p>
        </div>
      )}

      {recent.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <div className="hh-overline" style={{ marginBottom: 8 }}>Recent</div>
          {recent.map(({ date, it }) => (
            <div key={it.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "10px 0", borderTop: "1px solid var(--rule-1)" }}>
              <div style={{ minWidth: 0 }}>
                <div className="hh-serif" style={{ fontSize: 14, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{itemLabel(it)}</div>
                <div className="hh-num" style={{ fontSize: 11, color: "var(--ink-2)" }}>{formatDate(date)} · {it.lesson_type_name}</div>
              </div>
              <Status kind={statusKind(it.evaluation!.result)}>{resultLabel(it.evaluation!.result)}</Status>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: 28 }}>
        <Link href="/student/practice"
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 0", borderTop: "1px solid var(--rule-1)", textDecoration: "none", color: "inherit" }}>
          <div>
            <div className="hh-serif" style={{ fontSize: 15 }}>Practice mode</div>
            <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 2 }}>Listen to any surah and verse range freely</div>
          </div>
          <IcoFwd s={12} />
        </Link>
      </div>
    </div>
  );
}
