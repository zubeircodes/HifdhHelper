// Streak — 14-day dot row. The only chart in the app.
// Filled = practiced, hollow = missed.

interface StreakProps {
  data: number[];
  size?: number;
  gap?: number;
}

export function Streak({ data, size = 6, gap = 5 }: StreakProps) {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap }}>
      {data.map((v, i) => (
        <span
          key={i}
          style={{
            width: size,
            height: size,
            borderRadius: size / 2,
            background: v > 0 ? "var(--sage-deep)" : "transparent",
            border: v > 0 ? "none" : "1px solid var(--rule-2)",
            opacity: v === 0 ? 0.6 : 0.5 + v * 0.1,
          }}
        />
      ))}
    </span>
  );
}
