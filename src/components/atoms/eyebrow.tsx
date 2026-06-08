// Eyebrow — uppercase tracked label above a heading.

import type { CSSProperties, ReactNode } from "react";

interface EyebrowProps {
  children: ReactNode;
  style?: CSSProperties;
}

export function Eyebrow({ children, style }: EyebrowProps) {
  return (
    <div className="hh-eyebrow" style={style}>
      {children}
    </div>
  );
}
