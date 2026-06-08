"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Eyebrow, IcoPlay, IcoPause, IcoBack, IcoFwd, VerseText } from "@/components/atoms";
import { SURAHS } from "@/lib/quran-meta";
import { getVerseRange } from "@/lib/quran-text";
import { getAudioUrl } from "@/lib/audio";

interface LoadedVerse {
  surah: number;
  verse: number;
  text: string;
}

export default function PracticeMode() {
  const [surahNum, setSurahNum] = useState(1);
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("7");
  const [reciter, setReciter] = useState("Alafasy_64kbps");
  const [repeats, setRepeats] = useState(3);
  const [currentRepeat, setCurrentRepeat] = useState(1);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentVerse, setCurrentVerse] = useState(0);
  const [verses, setVerses] = useState<LoadedVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewVerse, setPreviewVerse] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const surah = SURAHS.find((s) => s.number === surahNum);

  // Load a preview verse when surah changes
  useEffect(() => {
    getVerseRange(surahNum, 1, surahNum, 1).then((v) => {
      setPreviewVerse(v[0]?.text || "");
    });
  }, [surahNum]);

  // Play audio for the current verse
  const playVerse = useCallback((idx: number) => {
    if (!verses[idx]) return;
    const v = verses[idx];
    const url = getAudioUrl(reciter, v.surah, v.verse);

    if (!audioRef.current) {
      audioRef.current = new Audio();
    }

    const audio = audioRef.current;
    audio.src = url;
    audio.currentTime = 0;

    audio.onloadedmetadata = () => setDuration(audio.duration);
    audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
    audio.onended = () => {
      // Auto-advance to next verse
      if (idx < verses.length - 1) {
        const next = idx + 1;
        setCurrentVerse(next);
        playVerse(next);
      } else {
        // End of all verses — check repeats
        setCurrentRepeat((prev) => {
          const next = prev + 1;
          if (next <= repeats) {
            // Start the next repeat from the beginning
            setCurrentVerse(0);
            playVerse(0);
            return next;
          } else {
            // All repeats done
            setPlaying(false);
            return prev;
          }
        });
      }
    };
    audio.onerror = () => {
      console.error("Audio error for", url);
      setPlaying(false);
    };

    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }, [verses, reciter]);

  // When play/pause is toggled
  function togglePlay() {
    if (!audioRef.current) {
      playVerse(currentVerse);
      return;
    }

    if (playing) {
      audioRef.current.pause();
      setPlaying(false);
    } else {
      if (audioRef.current.src) {
        audioRef.current.play().then(() => setPlaying(true));
      } else {
        playVerse(currentVerse);
      }
    }
  }

  // Navigate verses
  function goTo(idx: number) {
    setCurrentVerse(idx);
    if (playing) {
      playVerse(idx);
    } else {
      // Load the audio but don't play
      if (audioRef.current) {
        const v = verses[idx];
        if (v) {
          audioRef.current.src = getAudioUrl(reciter, v.surah, v.verse);
          audioRef.current.load();
        }
      }
      setCurrentTime(0);
      setDuration(0);
    }
  }

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
    };
  }, []);

  async function handleStart() {
    setLoading(true);
    const sv = parseInt(from) || 1;
    const ev = parseInt(to) || 1;
    const v = await getVerseRange(surahNum, sv, surahNum, ev);
    setVerses(v);
    setCurrentVerse(0);
    setCurrentRepeat(1);
    setCurrentTime(0);
    setDuration(0);
    setLoading(false);
    setStarted(true);
  }

  function formatTime(s: number): string {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${String(sec).padStart(2, "0")}`;
  }

  if (!started) {
    return (
      <div style={{ padding: "16px 22px 20px", flex: "1 1 auto", overflow: "auto" }}>
        <Eyebrow>Practice mode</Eyebrow>
        <h1 className="hh-display" style={{ fontSize: 26, margin: "10px 0 8px" }}>
          Recite freely
        </h1>
        <p style={{ color: "var(--ink-1)", fontSize: 13, lineHeight: 1.6, margin: "0 0 32px" }}>
          Pick any surah and verse range. Loop as many times as you like — no assignments, no tracking.
        </p>

        <label style={{ fontSize: 11.5, color: "var(--ink-2)", letterSpacing: "0.02em", display: "block", marginBottom: 6 }}>
          Surah
        </label>
        <select
          className="hh-input"
          value={surahNum}
          onChange={(e) => {
            const n = +e.target.value;
            setSurahNum(n);
            setFrom("1");
            const s = SURAHS.find((s) => s.number === n);
            setTo(String(s?.verses || 1));
          }}
          style={{ marginBottom: 18, appearance: "auto" }}
        >
          {SURAHS.map((s) => (
            <option key={s.number} value={s.number}>
              {s.number}. {s.nameArabic} ({s.name})
            </option>
          ))}
        </select>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 28 }}>
          <div>
            <label style={{ fontSize: 11.5, color: "var(--ink-2)", letterSpacing: "0.02em", display: "block", marginBottom: 6 }}>
              From verse (1–{surah?.verses || "?"})
            </label>
            <input className="hh-input hh-num" value={from} onChange={(e) => setFrom(e.target.value)} type="number" min={1} max={surah?.verses} />
          </div>
          <div>
            <label style={{ fontSize: 11.5, color: "var(--ink-2)", letterSpacing: "0.02em", display: "block", marginBottom: 6 }}>
              To verse (1–{surah?.verses || "?"})
            </label>
            <input className="hh-input hh-num" value={to} onChange={(e) => setTo(e.target.value)} type="number" min={1} max={surah?.verses} />
          </div>
        </div>

        <div style={{ marginBottom: 28 }}>
          <label style={{ fontSize: 11.5, color: "var(--ink-2)", letterSpacing: "0.02em", display: "block", marginBottom: 6 }}>
            Repeats
          </label>
          <input
            className="hh-input hh-num"
            value={repeats}
            onChange={(e) => {
              const v = parseInt(e.target.value);
              if (!isNaN(v) && v >= 1) setRepeats(v);
              else if (e.target.value === "") setRepeats(1);
            }}
            type="number"
            min={1}
            max={100}
            style={{ width: 100 }}
          />
          <span style={{ fontSize: 11.5, color: "var(--ink-3)", marginLeft: 10 }}>
            times through all verses
          </span>
        </div>

        {/* Preview */}
        {previewVerse && (
          <div style={{ padding: "24px 20px", background: "var(--paper-3)", textAlign: "center", marginBottom: 28 }}>
            <div className="hh-eyebrow" style={{ marginBottom: 8 }}>Preview</div>
            <VerseText html={previewVerse} style={{ fontSize: "1.5rem", textAlign: "center" }} />
          </div>
        )}

        <button
          className="hh-btn primary lg"
          onClick={handleStart}
          disabled={loading}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {loading ? "Loading..." : "Start practicing"}
        </button>
      </div>
    );
  }

  // Practice player with working audio
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <>
      <div
        style={{
          flex: "0 0 auto",
          padding: "12px 18px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <button
          onClick={() => {
            if (audioRef.current) { audioRef.current.pause(); }
            setPlaying(false);
            setStarted(false);
          }}
          className="hh-btn ghost"
          style={{ padding: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-1)" }}
        >
          <IcoBack s={12} /> Back
        </button>
        <span className="hh-eyebrow" style={{ textAlign: "center" }}>
          Practice · {surah?.name}
        </span>
        <span style={{ width: 40 }} />
      </div>

      <div style={{ flex: "1 1 auto", padding: "12px 22px", overflow: "auto" }}>
        {verses.map((v, idx) => {
          const active = idx === currentVerse;
          return (
            <div
              key={`${v.surah}:${v.verse}`}
              onClick={() => goTo(idx)}
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

      <div style={{ flex: "0 0 auto", padding: "16px 22px 18px", background: "var(--paper-3)", borderTop: "1px solid var(--rule-1)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Eyebrow>Ayah {currentVerse + 1} of {verses.length}</Eyebrow>
          <span className="hh-num" style={{ fontSize: 11, color: "var(--ink-2)" }}>Repeat {currentRepeat} of {repeats}</span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
          <span className="hh-num" style={{ fontSize: 11, color: "var(--ink-2)" }}>{formatTime(currentTime)}</span>
          <div style={{ flex: 1, height: 2, background: "var(--rule-2)", borderRadius: 1, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, width: `${progress}%`, background: "var(--ink-0)", transition: "width 0.1s" }} />
          </div>
          <span className="hh-num" style={{ fontSize: 11, color: "var(--ink-2)" }}>{formatTime(duration)}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 36, marginTop: 18 }}>
          <button onClick={() => goTo(Math.max(0, currentVerse - 1))} className="hh-btn ghost" style={{ padding: 0, width: 36, height: 36, justifyContent: "center" }}>
            <IcoBack s={18} />
          </button>
          <button
            onClick={togglePlay}
            style={{
              width: 56, height: 56, borderRadius: 28,
              background: "var(--ink-0)", color: "var(--paper-1)",
              border: 0, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {playing ? <IcoPause s={18} /> : <IcoPlay s={18} />}
          </button>
          <button onClick={() => goTo(Math.min(verses.length - 1, currentVerse + 1))} className="hh-btn ghost" style={{ padding: 0, width: 36, height: 36, justifyContent: "center" }}>
            <IcoFwd s={18} />
          </button>
        </div>
      </div>
    </>
  );
}
