"use client";

// Passage selection shared by the engine test harnesses, so /recite and
// /recite/vosk always offer the same passages and resolve them identically.

import { useEffect, useMemo, useState } from "react";
import { SURAHS, getSurah } from "@/lib/quran-meta";
import { getVerseRange } from "@/lib/quran-text";
import { expectedWordsFromVerses, type ExpectedWord } from "@/lib/recitation";
import { getSampleRange } from "@/lib/recitation-samples";

export interface Preset {
  label: string;
  surah: number;
  from: number;
  to: number;
}

// Short on purpose. Al-Fatiha 1:1-2 is eight words: enough to see the cursor
// move, short enough to repeat quickly while testing on a phone.
export const PRESETS: Preset[] = [
  { label: "Al-Fatihah 1:1–2", surah: 1, from: 1, to: 2 },
  { label: "Al-Fatihah 1:1–7", surah: 1, from: 1, to: 7 },
  { label: "Al-Ikhlas 112:1–4", surah: 112, from: 1, to: 4 },
  { label: "An-Nas 114:1–6", surah: 114, from: 1, to: 6 },
  { label: "Al-Baqarah 2:1–5", surah: 2, from: 1, to: 5 },
];

export interface Passage {
  surah: number;
  from: number;
  to: number;
  key: string;
  words: ExpectedWord[];
  loading: boolean;
  error: string;
  setSurah: (n: number) => void;
  setFrom: (n: number) => void;
  setTo: (n: number) => void;
  apply: (p: Preset) => void;
}

/**
 * Resolve the selected passage to expected words.
 *
 * Preset passages are bundled and resolve synchronously. Only a custom range
 * falls back to the 3.8 MB corpus, which is far too slow over a tunnel or on a
 * phone to be the default path.
 */
export function usePassage(initial: Preset = PRESETS[0]): Passage {
  const [surah, setSurah] = useState(initial.surah);
  const [from, setFrom] = useState(initial.from);
  const [to, setTo] = useState(initial.to);

  const key = `${surah}:${from}-${to}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    words: ExpectedWord[];
    error: string;
  } | null>(null);

  const sample = from <= to ? getSampleRange(surah, from, to) : null;
  const sampleWords = useMemo(
    () => (sample ? expectedWordsFromVerses(sample) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  useEffect(() => {
    if (sampleWords) return;
    let cancelled = false;
    getVerseRange(surah, from, surah, to)
      .then((verses) => {
        if (!cancelled) setLoaded({ key, words: expectedWordsFromVerses(verses), error: "" });
      })
      .catch((e: unknown) => {
        if (!cancelled) setLoaded({ key, words: [], error: String(e) });
      });
    return () => {
      cancelled = true;
    };
  }, [surah, from, to, key, sampleWords]);

  return {
    surah,
    from,
    to,
    key,
    words: sampleWords ?? (loaded?.key === key ? loaded.words : []),
    loading: !sampleWords && loaded?.key !== key,
    error: sampleWords ? "" : loaded?.key === key ? loaded.error : "",
    setSurah,
    setFrom,
    setTo,
    apply: (p: Preset) => {
      setSurah(p.surah);
      setFrom(p.from);
      setTo(p.to);
    },
  };
}

export function PassagePicker({ passage, idPrefix }: { passage: Passage; idPrefix: string }) {
  const { surah, from, to } = passage;
  const max = getSurah(surah)?.verses ?? 1;

  return (
    <div style={{ marginBottom: 18 }}>
      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0 14px" }}>
        {PRESETS.map((p) => {
          const active = p.surah === surah && p.from === from && p.to === to;
          return (
            <button
              key={p.label}
              className={active ? "hh-btn primary sm" : "hh-btn ghost sm"}
              onClick={() => passage.apply(p)}
            >
              {p.label}
            </button>
          );
        })}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
        <div>
          <label htmlFor={`${idPrefix}-surah`} style={labelStyle}>
            Surah
          </label>
          <select
            id={`${idPrefix}-surah`}
            className="hh-input"
            value={surah}
            onChange={(e) => {
              const n = +e.target.value;
              passage.setSurah(n);
              passage.setFrom(1);
              passage.setTo(Math.min(2, getSurah(n)?.verses ?? 1));
            }}
            style={{ appearance: "auto" }}
          >
            {SURAHS.map((s) => (
              <option key={s.number} value={s.number}>
                {s.number}. {s.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${idPrefix}-from`} style={labelStyle}>
            From
          </label>
          <input
            id={`${idPrefix}-from`}
            className="hh-input hh-num"
            type="number"
            inputMode="numeric"
            min={1}
            max={max}
            value={from}
            onChange={(e) =>
              passage.setFrom(Math.min(Math.max(parseInt(e.target.value) || 1, 1), max))
            }
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-to`} style={labelStyle}>
            To
          </label>
          <input
            id={`${idPrefix}-to`}
            className="hh-input hh-num"
            type="number"
            inputMode="numeric"
            min={from}
            max={max}
            value={to}
            onChange={(e) =>
              passage.setTo(Math.min(Math.max(parseInt(e.target.value) || 1, 1), max))
            }
          />
        </div>
      </div>
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  fontSize: 11.5,
  color: "var(--ink-2)",
  display: "block",
  marginBottom: 5,
};
