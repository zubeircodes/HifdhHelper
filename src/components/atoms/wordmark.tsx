// Wordmark — "Hifdh Helper" in Newsreader. No logo, just type.

interface WordmarkProps {
  size?: number;
}

export function Wordmark({ size = 17 }: WordmarkProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
      <span
        className="hh-serif"
        style={{
          fontSize: size,
          letterSpacing: "-0.015em",
          color: "var(--ink-0)",
          fontWeight: 400,
        }}
      >
        Hifdh{" "}
        <span style={{ fontStyle: "italic", fontWeight: 300 }}>Helper</span>
      </span>
    </span>
  );
}
