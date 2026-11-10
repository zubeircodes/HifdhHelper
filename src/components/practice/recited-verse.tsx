"use client";

// RecitedVerse — renders the expected words with per-word status.
//
// VerseText injects a whole verse as one blob, so it has no per-word element to
// colour. This renders one span per word instead, keeping each word's <rule>
// tags inside its span so tajweed colouring survives alongside the status.

import { VerseMark } from "@/components/atoms";
import type { ExpectedWord, WordStatus } from "@/lib/recitation";

interface RecitedVerseProps {
  words: ExpectedWord[];
  status: WordStatus[];
  /** Index of the word being listened for. */
  cursor: number;
  /** True when held on a misread word. */
  waiting: boolean;
  /** Tap a word to reveal it. */
  onReveal?: (index: number) => void;
  fontSize?: number;
}

const STATUS_STYLE: Record<WordStatus, React.CSSProperties> = {
  pending: { color: "var(--ink-2)", opacity: 0.55 },
  correct: { color: "var(--pass)" },
  tashkeel: { color: "var(--partial)", textDecoration: "underline dotted" },
  skipped: { color: "var(--fail)", opacity: 0.6, textDecoration: "line-through" },
  substitution: { color: "var(--fail)" },
  mismatch: { color: "var(--fail)", textDecoration: "underline wavy" },
  revealed: { color: "var(--ink-1)", opacity: 0.8, textDecoration: "underline" },
};

export function RecitedVerse({
  words,
  status,
  cursor,
  waiting,
  onReveal,
  fontSize = 30,
}: RecitedVerseProps) {
  return (
    <div
      className="hh-arabic"
      style={{
        fontSize,
        lineHeight: 2.1,
        textAlign: "center",
        direction: "rtl",
        padding: "18px 14px",
        background: "var(--paper-3)",
      }}
    >
      {words.map((w, i) => {
        const isCursor = i === cursor && cursor < words.length;
        const style: React.CSSProperties = {
          ...STATUS_STYLE[status[i] ?? "pending"],
          padding: "2px 4px",
          borderRadius: 3,
          cursor: onReveal ? "pointer" : undefined,
          transition: "color 0.15s, background 0.15s",
        };
        if (isCursor) {
          style.background = waiting ? "var(--partial)" : "var(--ink-0)";
          style.color = "var(--paper-1)";
          style.opacity = 1;
        }
        return (
          <span key={`${w.surah}:${w.verse}:${i}`}>
            <span
              style={style}
              onClick={onReveal ? () => onReveal(i) : undefined}
              title={onReveal ? "Tap to reveal" : undefined}
              dangerouslySetInnerHTML={{ __html: w.html }}
            />
            {w.lastInVerse && (
              <span style={{ margin: "0 6px", opacity: 0.5, verticalAlign: "middle" }}>
                <VerseMark n={w.verse} size={20} />
              </span>
            )}{" "}
          </span>
        );
      })}
    </div>
  );
}
