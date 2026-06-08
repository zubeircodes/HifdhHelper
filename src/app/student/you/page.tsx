"use client";

import { useEffect, useState } from "react";
import { Eyebrow, Avatar, SignOutButton } from "@/components/atoms";
import { createClient } from "@/lib/supabase";

export default function StudentYou() {
  const [user, setUser] = useState<{ name: string; email: string; initials: string } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name = user.user_metadata?.display_name || user.email?.split("@")[0] || "";
      const parts = name.split(" ");
      const initials = parts.length >= 2
        ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
        : name.slice(0, 2).toUpperCase();
      setUser({ name, email: user.email || "", initials });
    });
  }, []);

  if (!user) {
    return (
      <div style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--ink-2)", fontSize: 13 }}>Loading...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: "16px 22px 20px", flex: "1 1 auto" }}>
      <Eyebrow>Account</Eyebrow>
      <div style={{ display: "flex", alignItems: "center", gap: 16, marginTop: 16, paddingBottom: 24, borderBottom: "1px solid var(--rule-1)" }}>
        <Avatar initials={user.initials} size={48} />
        <div>
          <div className="hh-serif" style={{ fontSize: 18 }}>{user.name}</div>
          <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 2 }}>{user.email}</div>
        </div>
      </div>

      <div style={{ marginTop: 32 }}>
        <SignOutButton
          className="hh-btn lg"
          style={{ width: "100%", justifyContent: "center" }}
        />
      </div>
    </div>
  );
}
