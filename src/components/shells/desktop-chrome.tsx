// DesktopChrome — layout shell for Instructor + Admin views.
// 200px text-only rail on desktop, hidden on mobile.

import type { ReactNode } from "react";

interface DesktopChromeProps {
  children: ReactNode;
  rail?: ReactNode;
  top?: ReactNode;
}

export function DesktopChrome({ children, rail, top }: DesktopChromeProps) {
  return (
    <div className="hh-desktop-chrome">
      {/* Rail */}
      {rail && <aside className="hh-desktop-rail">{rail}</aside>}

      {/* Main */}
      <main className="hh-desktop-main">
        {top && <div className="hh-desktop-top">{top}</div>}
        <div style={{ flex: "1 1 auto", overflow: "auto" }}>{children}</div>
      </main>
    </div>
  );
}
