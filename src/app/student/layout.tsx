"use client";

import { MobileShell, Tab } from "@/components/shells";
import { usePathname, useRouter } from "next/navigation";

const tabs = [
  { label: "Today", href: "/student" },
  { label: "Practice", href: "/student/practice" },
  { label: "You", href: "/student/you" },
];

export default function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  // Hide tab bar on the player screen
  const hideTab = pathname.startsWith("/student/player");

  return (
    <MobileShell
      tab={
        hideTab ? undefined : (
          <>
            {tabs.map((t) => (
              <Tab
                key={t.href}
                label={t.label}
                active={pathname === t.href || (t.href === "/student" && pathname === "/student/join")}
                onClick={() => router.push(t.href)}
              />
            ))}
          </>
        )
      }
    >
      {children}
    </MobileShell>
  );
}
