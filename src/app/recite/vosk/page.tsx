"use client";

// /recite/vosk — the Vosk (Kaldi, WASM) engine on the same harness as /recite.
//
// Same passages, same matcher, same renderer. Only the audio-to-words layer
// differs, which is the whole point of comparing them on one device.

import Link from "next/link";
import { Eyebrow } from "@/components/atoms";
import { PassagePicker, usePassage } from "@/components/practice/passage-picker";
import { VoskRecitationCheck } from "@/components/practice/vosk-recitation-check";

const HARNESS_BUILD = "vosk 1 · grammar-constrained kaldi";

export default function ReciteVoskPage() {
  const passage = usePassage();

  return (
    <div style={{ maxWidth: 700, margin: "0 auto", padding: "24px 16px 60px" }}>
      <Eyebrow>Device test · engine 2</Eyebrow>
      <h1 className="hh-display" style={{ fontSize: 28, margin: "8px 0 6px" }}>
        Vosk recitation check
      </h1>
      <p style={{ color: "var(--ink-1)", fontSize: 13, lineHeight: 1.6, margin: "0 0 10px" }}>
        Kaldi compiled to WASM, running entirely on this device. No Apple or Google speech
        service, so it behaves the same on every platform — and it can be constrained to the
        words of this passage, which is what Web Speech cannot do.
      </p>
      <p style={{ fontSize: 12.5, margin: "0 0 22px" }}>
        <Link href="/recite" style={{ color: "var(--ink-1)" }}>
          ← Web Speech engine
        </Link>
      </p>

      <Eyebrow>Passage</Eyebrow>
      <PassagePicker passage={passage} idPrefix="vosk" />

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
          <VoskRecitationCheck key={passage.key} words={passage.words} />
        </>
      )}

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
