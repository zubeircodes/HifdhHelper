"use client";

// /recite — device test harness for live recitation following, Web Speech engine.
//
// Public and auth-free on purpose: the point is to open it on a phone with as
// little friction as possible. Short passages by default, because proving the
// engine needs a few ayat, not a juz.

import Link from "next/link";
import { Eyebrow } from "@/components/atoms";
import { PassagePicker, usePassage } from "@/components/practice/passage-picker";
import { RecitationCheck } from "@/components/practice/recitation-check";

// Bump when the harness changes shape, so a stale page is obvious on sight.
const HARNESS_BUILD = "4 · shared passage picker";

export default function RecitePage() {
  const passage = usePassage();

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px 60px" }}>
      <Eyebrow>Device test · engine 1</Eyebrow>
      <h1 className="hh-display" style={{ fontSize: 28, margin: "8px 0 6px" }}>
        Live recitation check
      </h1>
      <p style={{ color: "var(--ink-1)", fontSize: 13, lineHeight: 1.6, margin: "0 0 10px" }}>
        Recite the passage aloud. Each word lights up as it is recognized. Tap any word to
        reveal it if you get stuck.
      </p>
      <p style={{ fontSize: 12.5, margin: "0 0 22px" }}>
        <Link href="/recite/vosk" style={{ color: "var(--ink-1)" }}>
          Vosk engine →
        </Link>
        {"  ·  "}
        <Link href="/" style={{ color: "var(--ink-1)" }}>
          Back to practice
        </Link>
      </p>

      <Eyebrow>Passage</Eyebrow>
      <PassagePicker passage={passage} idPrefix="rec" />

      {passage.error && (
        <p style={{ color: "var(--fail)", fontSize: 12.5 }}>
          Couldn&apos;t load the passage: {passage.error}
        </p>
      )}

      {passage.loading ? (
        <p style={{ color: "var(--ink-2)", fontSize: 13, lineHeight: 1.6 }}>
          Downloading the full Quran text (3.8 MB) for this custom range…
          <br />
          <span style={{ fontSize: 11.5, color: "var(--ink-3)" }}>
            The preset passages above load instantly and need no download.
          </span>
        </p>
      ) : passage.words.length === 0 ? (
        <p style={{ color: "var(--ink-2)", fontSize: 13 }}>No words in that range.</p>
      ) : (
        <>
          <p style={{ fontSize: 11.5, color: "var(--ink-2)", margin: "0 0 10px" }}>
            {passage.words.length} words expected
          </p>
          {/* Remount on passage change so all match state resets cleanly. */}
          <RecitationCheck key={passage.key} words={passage.words} />
        </>
      )}

      {/* Build marker: if this line is missing, the page being viewed is stale. */}
      <p
        style={{
          marginTop: 36,
          paddingTop: 12,
          borderTop: "1px solid var(--rule-1)",
          fontSize: 10.5,
          color: "var(--ink-3)",
          letterSpacing: "0.04em",
        }}
      >
        HARNESS BUILD {HARNESS_BUILD}
      </p>
    </div>
  );
}
