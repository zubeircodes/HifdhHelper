"use client";

import { useState } from "react";
import { Wordmark, Eyebrow } from "@/components/atoms";
import { PracticePlayer } from "@/components/practice/practice-player";
import Link from "next/link";

export default function Landing() {
  const [showInfo, setShowInfo] = useState(true);

  return (
    <div className={`hh-landing${showInfo ? " is-expanded" : ""}`}>
      {/* Top bar */}
      <div className="hh-landing-top">
        <Wordmark size={17} />
        <nav style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 12.5, whiteSpace: "nowrap" }}>
          <button
            type="button"
            onClick={() => setShowInfo((v) => !v)}
            aria-expanded={showInfo}
            aria-controls="landing-info"
            style={{
              background: "none", border: 0, padding: 0, cursor: "pointer",
              color: showInfo ? "var(--ink-0)" : "var(--ink-1)",
              fontWeight: showInfo ? 500 : 400, fontSize: "inherit",
            }}
          >
            {showInfo ? "Just practice" : "For teachers"}
          </button>
          <Link href="/login" style={{ color: "var(--ink-0)", fontWeight: 500, textDecoration: "none" }}>
            Sign in
          </Link>
        </nav>
      </div>

      <div className="hh-landing-body">
        {/* Info panel — hidden until requested; stays mounted so the player keeps playing */}
        <div id="landing-info" className="hh-landing-info" hidden={!showInfo}>
          <div style={{ maxWidth: 420 }}>
            <Eyebrow>For hifdh teachers</Eyebrow>
            <h1 className="hh-display hh-hero-title" style={{ fontSize: 40, margin: "16px 0 18px" }}>
              Every student&apos;s
              <br />
              <span style={{ fontStyle: "italic", color: "var(--sage-deep)" }}>sabaq</span>, in one place.
            </h1>
            <p style={{ fontSize: 14.5, lineHeight: 1.65, color: "var(--ink-1)", margin: "0 0 28px" }}>
              Keep track of what each student is memorising, what they&apos;re
              revising, and how they did — without a notebook. Works on its own
              for record keeping; link students when you&apos;re ready and they
              get their lesson on their phone.
            </p>
            <div style={{ display: "flex", gap: 14, alignItems: "center", flexWrap: "wrap" }}>
              <Link href="/signup" className="hh-btn primary lg" style={{ textDecoration: "none" }}>
                Create a teacher account
              </Link>
              <Link
                href="/login"
                style={{ fontSize: 12.5, color: "var(--ink-2)", textDecoration: "underline", textUnderlineOffset: 3 }}
              >
                Already have one? Sign in
              </Link>
            </div>

            <div style={{ marginTop: 48, paddingTop: 24, borderTop: "1px solid var(--rule-1)" }}>
              <div className="hh-eyebrow" style={{ marginBottom: 12 }}>How it works</div>
              <ol className="hh-serif" style={{ margin: 0, paddingLeft: 20, fontSize: 14.5, lineHeight: 1.8, color: "var(--ink-1)" }}>
                <li>Create a class and add your students by name.</li>
                <li>Assign each one a lesson: new verses, review ranges, or subac by juz, with a reciter and repeat count.</li>
                <li>On class day, open the student, grade each range Pass or Redo, add a note.</li>
                <li>Redo ranges carry into the next lesson; every grade stays in their history.</li>
              </ol>
              <p style={{ fontSize: 12.5, color: "var(--ink-2)", margin: "16px 0 0", lineHeight: 1.6 }}>
                Students who join with their code see the lesson, listen the set number of times, and mark it ready before class.
              </p>
            </div>

            <div style={{ marginTop: 40, fontSize: 10.5, color: "var(--ink-3)", letterSpacing: "0.04em" }}>
              Free while we get it right · Built for halaqat and madrasahs
            </div>
          </div>
        </div>

        {/* The free practice tool — always visible */}
        <div className="hh-landing-tool">
          <div className="hh-landing-practice">
            <div style={{ marginBottom: 22 }}>
              <div className="hh-display" style={{ fontSize: 28 }}>
                What are you memorizing?
              </div>
              <p style={{ fontSize: 13, lineHeight: 1.6, color: "var(--ink-2)", margin: "8px 0 0" }}>
                Pick a surah and verses, choose a reciter, and listen as many times as you need.
              </p>
            </div>
            <PracticePlayer embedded />
          </div>
        </div>
      </div>
    </div>
  );
}
