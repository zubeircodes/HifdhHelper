// MobileShell — phone-frame container for Student + Parent views.
// Status bar at top, optional text-only tab bar at bottom.

import type { ReactNode } from "react";

interface MobileShellProps {
  children: ReactNode;
  tab?: ReactNode;
}

export function MobileShell({ children, tab }: MobileShellProps) {
  return (
    <div
      style={{
        background: "var(--paper-1)",
        width: "100%",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        position: "relative",
      }}
    >
      {/* Content */}
      <div
        style={{
          flex: "1 1 auto",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {children}
      </div>

      {/* Tab bar */}
      {tab && (
        <div
          style={{
            flex: "0 0 auto",
            borderTop: "1px solid var(--rule-1)",
            padding: "0 8px 14px",
            display: "flex",
            background: "var(--paper-1)",
            position: "sticky",
            bottom: 0,
          }}
        >
          {tab}
        </div>
      )}
    </div>
  );
}

// Tab — text-only, no icons.
interface TabProps {
  label: string;
  active?: boolean;
  onClick?: () => void;
}

export function Tab({ label, active, onClick }: TabProps) {
  return (
    <button
      onClick={onClick}
      className={`hh-tab ${active ? "active" : ""}`}
      style={{ background: "none", border: "none", cursor: "pointer" }}
    >
      {label}
    </button>
  );
}
