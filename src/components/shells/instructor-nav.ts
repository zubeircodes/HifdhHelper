// One nav definition for both shells.
//
// Previously declared twice — grouped Teaching/Setup in the desktop rail, flat
// in the mobile header — with three of five labels drifted apart
// (Assignments/Assign, Evaluations/Evaluate, Lesson categories/Settings), plus
// a duplicated isActive. Not wired up until the nav flip phase.

export interface InstructorTab {
  href: string;
  label: string;
  key: string;
}

export const INSTRUCTOR_TABS: InstructorTab[] = [
  { href: "/instructor", label: "Today", key: "today" },
  { href: "/instructor/classes", label: "Classes", key: "classes" },
  { href: "/instructor/categories", label: "Setup", key: "setup" },
];

/**
 * The roster now lives under Classes, so a student profile highlights Classes.
 * Bulk assign is launched from Today, so it highlights Today.
 */
export function isTabActive(pathname: string, href: string): boolean {
  if (href === "/instructor") {
    return pathname === "/instructor" || pathname.startsWith("/instructor/assignments");
  }
  if (href === "/instructor/classes") {
    return (
      pathname.startsWith("/instructor/classes") ||
      pathname.startsWith("/instructor/students")
    );
  }
  return pathname.startsWith(href);
}
