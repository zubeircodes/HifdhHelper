"use client";

import { useState, useEffect } from "react";
import { IcoBack, IcoFwd, IcoPlay, IcoPause, IcoMore, Eyebrow, VerseText } from "@/components/atoms";
import { eastern } from "@/components/atoms/verse-mark";
import { getVerseRange } from "@/lib/quran-text";
import Link from "next/link";

interface LoadedVerse {
  surah: number;
  verse: number;
  text: string;
}

export default function QuranPlayer() {
  const [playing, setPlaying] = useState(false);
  const [currentVerse, setCurrentVerse] = useState(0);
  const [repeats] = useState(3);
  const [verses, setVerses] = useState<LoadedVerse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getVerseRange(1, 1, 1, 7).then((v) => {
      setVerses(v);
      setLoading(false);
    });
  }, []);

  if (loading) {
    return (
      <div style={{ flex: "1 1 auto", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <p style={{ color: "var(--ink-2)", fontSize: 13 }}>Loading verses...</p>
      </div>
    );
  }

  return (
    <>
      {/* Header */}
      <div
        style={{
          flex: "0 0 auto",
          padding: "12px 18px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <Link
          href="/student"
          style={{
            display: "inline-flex", alignItems: "center", gap: 6,
            color: "var(--ink-1)", fontSize: 12, flex: "0 0 auto",
            textDecoration: "none",
          }}
        >
          <IcoBack s={12} /> Today
        </Link>
        <span
          className="hh-eyebrow"
          style={{
            flex: "1 1 auto", textAlign: "center",
            whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
          }}
        >
          Al-Fātiḥah · 1:1–7
        </span>
        <span style={{ flex: "0 0 auto" }}><IcoMore s={14} /></span>
      </div>

      {/* Mushaf reading area — renders exactly like the old app */}
      <div style={{ flex: "1 1 auto", padding: "12px 22px", overflow: "auto" }}>
        {verses.map((v, idx) => {
          const active = idx === currentVerse;
          return (
            <div
              key={`${v.surah}:${v.verse}`}
              onClick={() => setCurrentVerse(idx)}
              style={{
                padding: "var(--space-md)",
                borderBottom: "1px solid var(--rule-1)",
                opacity: active ? 1 : 0.55,
                transition: "opacity 0.2s",
                cursor: "pointer",
              }}
            >
              <VerseText
                html={v.text}
                style={active ? { fontSize: "2rem" } : { fontSize: "1.6rem" }}
              />
            </div>
          );
        })}
      </div>

      {/* Player controls */}
      <div
        style={{
          flex: "0 0 auto",
          padding: "16px 22px 18px",
          background: "var(--paper-3)",
          borderTop: "1px solid var(--rule-1)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <div>
            <Eyebrow>Ayah {currentVerse + 1} of {verses.length}</Eyebrow>
            <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 4 }}>
              Repeat <span className="hh-num">{repeats}</span> of 5 · Mishary Alafasy
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, fontSize: 11, color: "var(--ink-2)" }}>
            <span>1.0×</span>
            <span style={{ color: "var(--ink-0)", fontWeight: 500 }}>↺ ayah</span>
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
          <span className="hh-num" style={{ fontSize: 11, color: "var(--ink-2)" }}>0:23</span>
          <div style={{ flex: 1, height: 2, background: "var(--rule-2)", borderRadius: 1, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, width: "38%", background: "var(--ink-0)" }} />
          </div>
          <span className="hh-num" style={{ fontSize: 11, color: "var(--ink-2)" }}>0:58</span>
        </div>

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 36, marginTop: 18 }}>
          <button
            onClick={() => setCurrentVerse(Math.max(0, currentVerse - 1))}
            className="hh-btn ghost"
            style={{ padding: 0, width: 36, height: 36, justifyContent: "center", flex: "0 0 auto" }}
          >
            <IcoBack s={18} />
          </button>
          <button
            onClick={() => setPlaying((p) => !p)}
            style={{
              width: 56, height: 56, borderRadius: 28,
              background: "var(--ink-0)", color: "var(--paper-1)",
              border: 0, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer", flex: "0 0 auto",
            }}
          >
            {playing ? <IcoPause s={18} /> : <IcoPlay s={18} />}
          </button>
          <button
            onClick={() => setCurrentVerse(Math.min(verses.length - 1, currentVerse + 1))}
            className="hh-btn ghost"
            style={{ padding: 0, width: 36, height: 36, justifyContent: "center", flex: "0 0 auto" }}
          >
            <IcoFwd s={18} />
          </button>
        </div>

        <div style={{ marginTop: 16, display: "flex", justifyContent: "center" }}>
          <button className="hh-btn">Mark this ayah memorized</button>
        </div>
      </div>
    </>
  );
}
