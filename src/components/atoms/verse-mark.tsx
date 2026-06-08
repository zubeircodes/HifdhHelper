// VerseMark — Eastern Arabic numeral in a hairline circle.

const easternDigits = ["٠", "١", "٢", "٣", "٤", "٥", "٦", "٧", "٨", "٩"];

export function eastern(n: number): string {
  return String(n)
    .split("")
    .map((d) => easternDigits[+d] || d)
    .join("");
}

interface VerseMarkProps {
  n: number;
  size?: number;
}

export function VerseMark({ n, size = 22 }: VerseMarkProps) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        borderRadius: size / 2,
        border: "0.75px solid var(--rule-3)",
        color: "var(--ink-2)",
        fontFamily: "var(--font-arabic)",
        fontSize: size * 0.55,
        lineHeight: 1,
        flex: "0 0 auto",
      }}
    >
      {eastern(n)}
    </span>
  );
}
