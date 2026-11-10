"use client";

// /recite — device test harness for live recitation following.
//
// Public and auth-free on purpose: the point is to open it on a phone with as
// little friction as possible. Short passages by default, because proving the
// engine needs a few ayat, not a juz.

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Eyebrow } from "@/components/atoms";
import { SURAHS, getSurah } from "@/lib/quran-meta";
import { getVerseRange } from "@/lib/quran-text";
import { expectedWordsFromVerses, type ExpectedWord } from "@/lib/recitation";
import { getSampleRange } from "@/lib/recitation-samples";
import { RecitationCheck } from "@/components/practice/recitation-check";

interface Preset {
  label: string;
  surah: number;
  from: number;
  to: number;
}

// Short on purpose. Al-Fatiha 1-2 is seven words: enough to see the cursor move.
const PRESETS: Preset[] = [
  { label: "Al-Fatihah 1:1–2", surah: 1, from: 1, to: 2 },
  { label: "Al-Fatihah 1:1–7", surah: 1, from: 1, to: 7 },
  { label: "Al-Ikhlas 112:1–4", surah: 112, from: 1, to: 4 },
  { label: "An-Nas 114:1–6", surah: 114, from: 1, to: 6 },
  { label: "Al-Baqarah 2:1–5", surah: 2, from: 1, to: 5 },
];

export default function RecitePage() {
  const [surah, setSurah] = useState(1);
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(2);
  // Keyed on the passage so `loading` is derived, not set inside the effect.
  const key = `${surah}:${from}-${to}`;
  const [loaded, setLoaded] = useState<{
    key: string;
    words: ExpectedWord[];
    error: string;
  } | null>(null);

  // Bundled passages resolve synchronously. Only a custom range pays for the
  // 3.8 MB corpus, and the UI says so rather than sitting on "Loading".
  const sample = from <= to ? getSampleRange(surah, from, to) : null;
  const sampleWords = useMemo(
    () => (sample ? expectedWordsFromVerses(sample) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  const loading = !sampleWords && loaded?.key !== key;
  const words = sampleWords ?? (loaded?.key === key ? loaded.words : []);
  const error = sampleWords ? "" : loaded?.key === key ? loaded.error : "";

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

  function applyPreset(p: Preset) {
    setSurah(p.surah);
    setFrom(p.from);
    setTo(p.to);
  }

  const max = getSurah(surah)?.verses ?? 1;

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px 60px" }}>
      <Eyebrow>Device test</Eyebrow>
      <h1 className="hh-display" style={{ fontSize: 28, margin: "8px 0 6px" }}>
        Live recitation check
      </h1>
      <p style={{ color: "var(--ink-1)", fontSize: 13, lineHeight: 1.6, margin: "0 0 22px" }}>
        Recite the passage aloud. Each word lights up as it is recognized. Tap any word to
        reveal it if you get stuck.{" "}
        <Link href="/" style={{ color: "var(--ink-1)" }}>
          Back to practice
        </Link>
      </p>

      {/* Passage picker */}
      <div style={{ marginBottom: 18 }}>
        <Eyebrow>Passage</Eyebrow>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", margin: "8px 0 14px" }}>
          {PRESETS.map((p) => {
            const active = p.surah === surah && p.from === from && p.to === to;
            return (
              <button
                key={p.label}
                className={active ? "hh-btn primary sm" : "hh-btn ghost sm"}
                onClick={() => applyPreset(p)}
              >
                {p.label}
              </button>
            );
          })}
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
          <div>
            <label
              htmlFor="rec-surah"
              style={{ fontSize: 11.5, color: "var(--ink-2)", display: "block", marginBottom: 5 }}
            >
              Surah
            </label>
            <select
              id="rec-surah"
              className="hh-input"
              value={surah}
              onChange={(e) => {
                const n = +e.target.value;
                setSurah(n);
                setFrom(1);
                setTo(Math.min(2, getSurah(n)?.verses ?? 1));
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
            <label
              htmlFor="rec-from"
              style={{ fontSize: 11.5, color: "var(--ink-2)", display: "block", marginBottom: 5 }}
            >
              From
            </label>
            <input
              id="rec-from"
              className="hh-input hh-num"
              type="number"
              inputMode="numeric"
              min={1}
              max={max}
              value={from}
              onChange={(e) =>
                setFrom(Math.min(Math.max(parseInt(e.target.value) || 1, 1), max))
              }
            />
          </div>
          <div>
            <label
              htmlFor="rec-to"
              style={{ fontSize: 11.5, color: "var(--ink-2)", display: "block", marginBottom: 5 }}
            >
              To
            </label>
            <input
              id="rec-to"
              className="hh-input hh-num"
              type="number"
              inputMode="numeric"
              min={from}
              max={max}
              value={to}
              onChange={(e) => setTo(Math.min(Math.max(parseInt(e.target.value) || 1, 1), max))}
            />
          </div>
        </div>
      </div>

      {error && (
        <p style={{ color: "var(--fail)", fontSize: 12.5 }}>Couldn&apos;t load the passage: {error}</p>
      )}

      {loading ? (
        <p style={{ color: "var(--ink-2)", fontSize: 13, lineHeight: 1.6 }}>
          Downloading the full Quran text (3.8 MB) for this custom range…
          <br />
          <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
            The preset passages above load instantly and need no download.
          </span>
        </p>
      ) : words.length === 0 ? (
        <p style={{ color: "var(--ink-2)", fontSize: 13 }}>No words in that range.</p>
      ) : (
        <>
          <p style={{ fontSize: 11.5, color: "var(--ink-2)", margin: "0 0 10px" }}>
            {words.length} words expected
          </p>
          {/* Remount on passage change so all match state resets cleanly. */}
          <RecitationCheck key={`${surah}:${from}-${to}`} words={words} />
        </>
      )}
    </div>
  );
}
