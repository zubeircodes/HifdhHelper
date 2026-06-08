// Status — text label with a 5px colored dot. No pills, no backgrounds.

import type { ReactNode } from "react";

interface StatusProps {
  kind: "pass" | "partial" | "fail" | "muted";
  children: ReactNode;
}

export function Status({ kind, children }: StatusProps) {
  return <span className={`hh-status ${kind}`}>{children}</span>;
}
