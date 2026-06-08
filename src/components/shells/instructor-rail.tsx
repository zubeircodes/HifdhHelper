"use client";

import { useState, useEffect } from "react";
import { Wordmark, Avatar, Eyebrow, SignOutButton } from "@/components/atoms";
import { createClient } from "@/lib/supabase";
import Link from "next/link";
import { usePathname } from "next/navigation";

const teachingLinks = [
  { href: "/instructor", label: "Students", key: "students" },
  { href: "/instructor/classes", label: "Classes", key: "classes" },
  { href: "/instructor/assignments", label: "Assignments", key: "assignments" },
  { href: "/instructor/evaluate", label: "Evaluations", key: "evaluate" },
];

const setupLinks = [
  { href: "/instructor/categories", label: "Lesson categories", key: "categories" },
];

export function InstructorRail() {
  const pathname = usePathname();
  const [userName, setUserName] = useState("Instructor");
  const [initials, setInitials] = useState("IN");

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      const name = user.user_metadata?.display_name || user.email?.split("@")[0] || "Instructor";
      setUserName(name);
      const parts = name.split(" ");
      setInitials(
        parts.length >= 2
          ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
          : name.slice(0, 2).toUpperCase()
      );
    });
  }, []);

  function isActive(href: string) {
    if (href === "/instructor") return pathname === "/instructor" || pathname.startsWith("/instructor/students");
    return pathname.startsWith(href);
  }

  return (
    <>
      <div style={{ padding: "0 6px" }}>
        <Link href="/instructor" style={{ textDecoration: "none" }}>
          <Wordmark size={17} />
        </Link>
      </div>

      <nav style={{ display: "flex", flexDirection: "column", gap: 2, marginTop: 4 }}>
        <Eyebrow style={{ padding: "0 12px 8px" }}>Teaching</Eyebrow>
        {teachingLinks.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            className={`hh-rail ${isActive(link.href) ? "active" : ""}`}
            style={{ textDecoration: "none" }}
          >
            {link.label}
          </Link>
        ))}

        <Eyebrow style={{ padding: "24px 12px 8px" }}>Setup</Eyebrow>
        {setupLinks.map((link) => (
          <Link
            key={link.key}
            href={link.href}
            className={`hh-rail ${isActive(link.href) ? "active" : ""}`}
            style={{ textDecoration: "none" }}
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <div style={{ marginTop: "auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 6px" }}>
          <Avatar initials={initials} size={28} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 500 }}>{userName}</div>
          </div>
        </div>
        <SignOutButton style={{ width: "100%", marginTop: 8 }} />
      </div>
    </>
  );
}
