"use client";

import { Wordmark, SignOutButton } from "@/components/atoms";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { label: "Students", href: "/instructor" },
  { label: "Classes", href: "/instructor/classes" },
  { label: "Assign", href: "/instructor/assignments" },
  { label: "Evaluate", href: "/instructor/evaluate" },
  { label: "Settings", href: "/instructor/categories" },
];

export function InstructorMobileHeader() {
  const pathname = usePathname();

  function isActive(href: string) {
    if (href === "/instructor") return pathname === "/instructor" || pathname.startsWith("/instructor/students");
    return pathname.startsWith(href);
  }

  return (
    <>
      <div className="hh-mobile-header">
        <Link href="/instructor" style={{ textDecoration: "none" }}>
          <Wordmark size={15} />
        </Link>
        <SignOutButton />
      </div>

      <div className="hh-mobile-nav">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className={`hh-tab${isActive(t.href) ? " active" : ""}`}
            style={{ textDecoration: "none" }}
          >
            {t.label}
          </Link>
        ))}
      </div>
    </>
  );
}
