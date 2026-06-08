"use client";

import { useState, useEffect } from "react";
import { Eyebrow, Avatar, Streak, IcoFwd } from "@/components/atoms";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";

// Sample data for the enrolled state (will be replaced with real queries)
const sampleAssignment = {
  sabaq: { surah: "Al-Baqarah", range: "2:30–35", reciter: "Alafasy", repeat: 5 },
  sabqi: { surah: "Al-Baqarah", range: "2:21–29" },
  manzil: { surah: "Al-Fātiḥah", range: "1:1–7" },
};

export default function StudentDashboard() {
  const [user, setUser] = useState<{ display_name: string; initials: string } | null>(null);
  const [enrolled, setEnrolled] = useState<boolean | null>(null);
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

      setEnrolled(enrollments && enrollments.length > 0);
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
            <Eyebrow>Tuesday</Eyebrow>
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
            Enter the invite code your teacher gave you.
          </p>
          <Link href="/student/join" className="hh-btn primary" style={{ textDecoration: "none" }}>
            Enter invite code
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

  // Enrolled — show today's lesson
  const spark = [3, 4, 3, 5, 4, 4, 5, 5, 4, 5, 5, 5, 4, 5];

  return (
    <div style={{ padding: "16px 22px 20px", flex: "1 1 auto", overflow: "auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div>
          <Eyebrow>Tuesday</Eyebrow>
          <div className="hh-display" style={{ fontSize: 26, marginTop: 6 }}>
            <span style={{ fontStyle: "italic" }}>As-salām</span>
            <br />
            ʿalaykum, {user?.display_name}.
          </div>
        </div>
        <Avatar initials={user?.initials || "??"} size={32} />
      </div>

      {/* Streak */}
      <div style={{ marginTop: 28, padding: "18px 18px", background: "var(--paper-3)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Eyebrow>Streak</Eyebrow>
          <span className="hh-num" style={{ fontSize: 11, color: "var(--ink-2)" }}>past 14 days</span>
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginTop: 6 }}>
          <span className="hh-display hh-num" style={{ fontSize: 28 }}>12</span>
          <span style={{ fontSize: 12, color: "var(--ink-1)" }}>days · alhamdulillah</span>
        </div>
        <div style={{ marginTop: 12 }}><Streak data={spark} size={7} gap={6} /></div>
      </div>

      {/* Today's lesson */}
      <div style={{ marginTop: 32 }}>
        <div className="hh-overline" style={{ marginBottom: 12 }}>Today&apos;s lesson</div>
        <div className="hh-serif" style={{ fontSize: 22, lineHeight: 1.3 }}>
          {sampleAssignment.sabaq.surah}
          <div style={{ fontSize: 14, color: "var(--ink-2)", fontStyle: "italic", marginTop: 2 }}>
            verses <span className="hh-num">{sampleAssignment.sabaq.range}</span>
          </div>
        </div>

        <div style={{ marginTop: 16, fontSize: 12, color: "var(--ink-2)", lineHeight: 1.7 }}>
          New verses today · 6 ayāt<br />
          Reciter — {sampleAssignment.sabaq.reciter}<br />
          Repeat — ×{sampleAssignment.sabaq.repeat}
        </div>

        <Link
          href="/student/player"
          className="hh-btn primary lg"
          style={{ marginTop: 22, width: "100%", justifyContent: "center", textDecoration: "none" }}
        >
          Begin reciting
        </Link>
      </div>

      {/* Also today */}
      <div style={{ marginTop: 28 }}>
        <div className="hh-overline" style={{ marginBottom: 12 }}>Also today</div>
        <Link
          href="/student/player"
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            padding: "12px 0", textDecoration: "none", color: "inherit",
          }}
        >
          <div>
            <div className="hh-eyebrow" style={{ marginBottom: 4 }}>Review · recent revision</div>
            <div className="hh-serif" style={{ fontSize: 15 }}>
              {sampleAssignment.sabqi.surah}{" "}
              <span className="hh-num" style={{ color: "var(--ink-2)" }}>{sampleAssignment.sabqi.range}</span>
            </div>
          </div>
          <IcoFwd s={12} />
        </Link>
        <hr className="hh-rule" style={{ margin: "0" }} />
        <Link
          href="/student/player"
          style={{
            display: "flex", justifyContent: "space-between", alignItems: "baseline",
            padding: "12px 0", textDecoration: "none", color: "inherit",
          }}
        >
          <div>
            <div className="hh-eyebrow" style={{ marginBottom: 4 }}>Group Review · old revision</div>
            <div className="hh-serif" style={{ fontSize: 15 }}>
              {sampleAssignment.manzil.surah}{" "}
              <span className="hh-num" style={{ color: "var(--ink-2)" }}>{sampleAssignment.manzil.range}</span>
            </div>
          </div>
          <IcoFwd s={12} />
        </Link>
      </div>

      {/* Instructor note */}
      <div style={{ marginTop: 36, padding: "18px 0", borderTop: "1px solid var(--rule-1)" }}>
        <div className="hh-eyebrow" style={{ marginBottom: 8 }}>From Ustadh Yusuf · 1d ago</div>
        <p className="hh-serif" style={{ fontSize: 14, lineHeight: 1.6, color: "var(--ink-1)", margin: 0, fontStyle: "italic" }}>
          &ldquo;Better — ayah 4 is clean now. One ghunnah needs more nasalization.&rdquo;
        </p>
      </div>
    </div>
  );
}
