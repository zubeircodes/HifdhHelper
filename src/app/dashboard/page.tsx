"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase";
import { useRouter } from "next/navigation";

export default function Dashboard() {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.replace("/login");
        return;
      }

      const role = data.user.user_metadata?.role_intent;

      if (role === "instructor" || role === "admin") {
        // Check if they have a halaqa yet
        const { data: halaqat } = await supabase
          .from("halaqat")
          .select("id")
          .eq("instructor_id", data.user.id)
          .limit(1);

        if (!halaqat || halaqat.length === 0) {
          router.replace("/instructor/setup");
        } else {
          router.replace("/instructor");
        }
      } else if (role === "student") {
        router.replace("/student");
      } else if (role === "parent") {
        router.replace("/parent");
      } else {
        router.replace("/student");
      }
    });
  }, [router]);

  return (
    <div style={{ minHeight: "100vh", background: "var(--paper-1)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <p style={{ color: "var(--ink-2)", fontSize: 13 }}>Redirecting...</p>
    </div>
  );
}
