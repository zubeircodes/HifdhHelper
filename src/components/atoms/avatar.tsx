// Avatar — initials in a paper-toned chip. No photos ever.

interface AvatarProps {
  initials: string;
  size?: number;
  tone?: string;
}

export function Avatar({ initials, size = 28, tone }: AvatarProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size / 2,
        background: tone || "var(--paper-3)",
        color: "var(--ink-1)",
        fontSize: size * 0.36,
        fontWeight: 500,
        letterSpacing: "0.02em",
        flex: "0 0 auto",
        border: "1px solid var(--rule-1)",
      }}
    >
      {initials}
    </span>
  );
}
