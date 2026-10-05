"use client";

// PracticePlayer — free, client-only listen-and-repeat tool.
// Used on the public landing page (embedded) and the student Practice tab.
// No backend: pick a surah, a verse range, a reciter, and a repeat count.

import { useState, useEffect, useRef, useCallback } from "react";
import { Eyebrow, IcoPlay, IcoPause, IcoBack, IcoFwd, VerseText } from "@/components/atoms";
import { SURAHS, getSurah } from "@/lib/quran-meta";
import { getVerseRange } from "@/lib/quran-text";
import { getAudioUrl, RECITERS, DEFAULT_RECITER } from "@/lib/audio";

interface LoadedVerse {
  surah: number;
  verse: number;
  text: string;
}

interface PracticePlayerProps {
  /** Embedded inside the landing aside: tighter spacing, capped verse list. */
  embedded?: boolean;
}

function formatTime(s: number): string {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${String(sec).padStart(2, "0")}`;
}

const MAX_REPEATS = 100;

const labelStyle: React.CSSProperties = {
  fontSize: 11.5,
  color: "var(--ink-2)",
  letterSpacing: "0.02em",
  display: "block",
  marginBottom: 6,
};

export function PracticePlayer({ embedded = false }: PracticePlayerProps) {
  const [surahNum, setSurahNum] = useState(1);
  const [from, setFrom] = useState("1");
  const [to, setTo] = useState("7");
  const [reciter, setReciter] = useState(DEFAULT_RECITER);
  // Kept as text so the user can clear and retype freely; clamped when read.
  const [repeatsInput, setRepeatsInput] = useState("3");
  const repeats = Math.min(Math.max(parseInt(repeatsInput) || 1, 1), MAX_REPEATS);
  const [currentRepeat, setCurrentRepeat] = useState(1);
  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [currentVerse, setCurrentVerse] = useState(0);
  const [verses, setVerses] = useState<LoadedVerse[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewVerse, setPreviewVerse] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [audioError, setAudioError] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  // Refs so the audio "ended" handler always sees current values
  // without re-creating the handler (and without self-referencing a callback).
  const versesRef = useRef<LoadedVerse[]>([]);
  const repeatsRef = useRef(repeats);
  const reciterRef = useRef(reciter);
  const activeIdxRef = useRef(0);
  const repeatRef = useRef(1);

  versesRef.current = verses;
  repeatsRef.current = repeats;
  reciterRef.current = reciter;

  const surah = getSurah(surahNum);
  const insetTone = embedded ? "var(--paper-2)" : "var(--paper-3)";

  // Load a preview verse when surah changes
  useEffect(() => {
    let cancelled = false;
    getVerseRange(surahNum, 1, surahNum, 1).then((v) => {
      if (!cancelled) setPreviewVerse(v[0]?.text || "");
    });
    return () => { cancelled = true; };
  }, [surahNum]);

  const getAudio = useCallback(() => {
    if (!audioRef.current) {
      const audio = new Audio();
      audio.preload = "auto";
      audio.onloadedmetadata = () => setDuration(audio.duration);
      audio.ontimeupdate = () => setCurrentTime(audio.currentTime);
      audio.onerror = () => { setPlaying(false); setAudioError(true); };
      audio.onended = () => {
        const list = versesRef.current;
        const idx = activeIdxRef.current;
        if (idx < list.length - 1) {
          loadAndPlay(idx + 1);
          return;
        }
        // End of range — next repeat or stop
        const nextRepeat = repeatRef.current + 1;
        if (nextRepeat <= repeatsRef.current) {
          repeatRef.current = nextRepeat;
          setCurrentRepeat(nextRepeat);
          loadAndPlay(0);
        } else {
          setPlaying(false);
        }
      };
      audioRef.current = audio;
    }
    return audioRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function loadAndPlay(idx: number) {
    const v = versesRef.current[idx];
    if (!v) return;
    const audio = getAudio();
    activeIdxRef.current = idx;
    setCurrentVerse(idx);
    setAudioError(false);
    audio.src = getAudioUrl(reciterRef.current, v.surah, v.verse);
    audio.currentTime = 0;
    audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
  }

  function togglePlay() {
    const audio = getAudio();
    if (playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (audio.src && activeIdxRef.current === currentVerse) {
      audio.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    } else {
      loadAndPlay(currentVerse);
    }
  }

  function goTo(idx: number) {
    const clamped = Math.max(0, Math.min(verses.length - 1, idx));
    if (playing) {
      loadAndPlay(clamped);
      return;
    }
    activeIdxRef.current = clamped;
    setCurrentVerse(clamped);
    setCurrentTime(0);
    setDuration(0);
    const audio = getAudio();
    const v = verses[clamped];
    if (v) {
      audio.src = getAudioUrl(reciter, v.surah, v.verse);
      audio.load();
    }
  }

  // Keep the active ayah in view as playback advances
  const activeVerseRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    activeVerseRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentVerse]);

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.onended = null;
        audioRef.current = null;
      }
    };
  }, []);

  async function handleStart() {
    if (!surah) return;
    setLoading(true);
    const max = surah.verses;
    let sv = Math.min(Math.max(parseInt(from) || 1, 1), max);
    let ev = Math.min(Math.max(parseInt(to) || 1, 1), max);
    if (ev < sv) [sv, ev] = [ev, sv];
    setFrom(String(sv));
    setTo(String(ev));

    setRepeatsInput(String(repeats));

    const v = await getVerseRange(surahNum, sv, surahNum, ev);
    versesRef.current = v;
    setVerses(v);
    activeIdxRef.current = 0;
    repeatRef.current = 1;
    setCurrentVerse(0);
    setCurrentRepeat(1);
    setCurrentTime(0);
    setDuration(0);
    setAudioError(false);
    setLoading(false);
    setStarted(true);
  }

  function handleBack() {
    if (audioRef.current) audioRef.current.pause();
    setPlaying(false);
    setStarted(false);
  }

  // ── Picker ──
  if (!started) {
    return (
      <div
        className={embedded ? "hh-practice hh-practice--embedded" : "hh-practice"}
        style={embedded ? undefined : { padding: "16px 22px 20px", flex: "1 1 auto", overflow: "auto" }}
      >
        {!embedded && (
          <>
            <Eyebrow>Practice mode</Eyebrow>
            <h1 className="hh-display" style={{ fontSize: 26, margin: "10px 0 8px" }}>
              Recite freely
            </h1>
            <p style={{ color: "var(--ink-1)", fontSize: 13, lineHeight: 1.6, margin: "0 0 32px" }}>
              Pick any surah and verse range. Loop as many times as you like — no assignments, no tracking.
            </p>
          </>
        )}

        <label style={labelStyle}>Surah</label>
        <select
          className="hh-input"
          value={surahNum}
          onChange={(e) => {
            const n = +e.target.value;
            setSurahNum(n);
            setFrom("1");
            setTo(String(getSurah(n)?.verses || 1));
          }}
          style={{ marginBottom: 18, appearance: "auto" }}
        >
          {SURAHS.map((s) => (
            <option key={s.number} value={s.number}>
              {s.number}. {s.nameArabic} ({s.name})
            </option>
          ))}
        </select>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 18 }}>
          <div>
            <label style={labelStyle}>From verse (1–{surah?.verses || "?"})</label>
            <input className="hh-input hh-num" value={from} onChange={(e) => setFrom(e.target.value)} type="number" min={1} max={surah?.verses} inputMode="numeric" />
          </div>
          <div>
            <label style={labelStyle}>To verse (1–{surah?.verses || "?"})</label>
            <input className="hh-input hh-num" value={to} onChange={(e) => setTo(e.target.value)} type="number" min={1} max={surah?.verses} inputMode="numeric" />
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
          <div>
            <label style={labelStyle}>Reciter</label>
            <select className="hh-input" value={reciter} onChange={(e) => setReciter(e.target.value)} style={{ appearance: "auto" }}>
              {RECITERS.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={labelStyle} htmlFor="hh-repeats">Repeats</label>
            <div className="hh-stepper">
              <button
                type="button"
                aria-label="Fewer repeats"
                onClick={() => setRepeatsInput(String(Math.max(1, repeats - 1)))}
                disabled={repeats <= 1}
              >
                −
              </button>
              <input
                id="hh-repeats"
                className="hh-num"
                value={repeatsInput}
                onChange={(e) => setRepeatsInput(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={() => setRepeatsInput(String(repeats))}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                aria-label="Number of repeats"
              />
              <button
                type="button"
                aria-label="More repeats"
                onClick={() => setRepeatsInput(String(Math.min(MAX_REPEATS, repeats + 1)))}
                disabled={repeats >= MAX_REPEATS}
              >
                +
              </button>
            </div>
          </div>
        </div>

        {previewVerse && (
          <div style={{ padding: "22px 20px", background: insetTone, textAlign: "center", marginBottom: 24 }}>
            <div className="hh-eyebrow" style={{ marginBottom: 8 }}>Preview · {surah?.name} 1</div>
            <VerseText html={previewVerse} style={{ fontSize: "1.5rem", textAlign: "center" }} />
          </div>
        )}

        <button
          className="hh-btn primary lg"
          onClick={handleStart}
          disabled={loading}
          style={{ width: "100%", justifyContent: "center" }}
        >
          {loading ? "Loading..." : "Start listening"}
        </button>
      </div>
    );
  }

  // ── Player ──
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0;
  const rangeLabel = `${surah?.name} ${surahNum}:${from}–${to}`;

  return (
    <div
      className={embedded ? "hh-practice hh-practice--embedded hh-practice--playing" : "hh-practice hh-practice--playing"}
      style={{ display: "flex", flexDirection: "column", flex: "1 1 auto", minHeight: 0 }}
    >
      <div
        style={{
          flex: "0 0 auto",
          padding: embedded ? "0 0 12px" : "12px 18px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
        }}
      >
        <button
          onClick={handleBack}
          className="hh-btn ghost"
          style={{ padding: 0, display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--ink-1)" }}
        >
          <IcoBack s={12} /> Change
        </button>
        <span
          className="hh-eyebrow"
          style={{ flex: "1 1 auto", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {rangeLabel}
        </span>
        <span style={{ width: 56 }} />
      </div>

      <div className="hh-practice-verses" style={{ flex: "1 1 auto", padding: embedded ? "0" : "12px 22px", overflow: "auto", minHeight: 0 }}>
        {verses.map((v, idx) => {
          const active = idx === currentVerse;
          return (
            <div
              key={`${v.surah}:${v.verse}`}
              ref={active ? activeVerseRef : null}
              onClick={() => goTo(idx)}
              style={{
                padding: "var(--space-md)",
                borderBottom: "1px solid var(--rule-1)",
                opacity: active ? 1 : 0.55,
                transition: "opacity 0.2s",
                cursor: "pointer",
              }}
            >
              <VerseText html={v.text} style={active ? { fontSize: "2rem" } : { fontSize: "1.6rem" }} />
            </div>
          );
        })}
      </div>

      <div
        style={{
          flex: "0 0 auto",
          padding: embedded ? "16px 0 0" : "16px 22px 18px",
          background: embedded ? "transparent" : "var(--paper-3)",
          borderTop: "1px solid var(--rule-1)",
          marginTop: embedded ? 12 : 0,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Eyebrow>Ayah {currentVerse + 1} of {verses.length}</Eyebrow>
          <span className="hh-num" style={{ fontSize: 11, color: "var(--ink-2)" }}>
            Repeat {currentRepeat} of {repeats}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 14 }}>
          <span className="hh-num" style={{ fontSize: 11, color: "var(--ink-2)" }}>{formatTime(currentTime)}</span>
          <div style={{ flex: 1, height: 2, background: "var(--rule-2)", borderRadius: 1, position: "relative" }}>
            <div style={{ position: "absolute", inset: 0, width: `${progress}%`, background: "var(--ink-0)", transition: "width 0.1s" }} />
          </div>
          <span className="hh-num" style={{ fontSize: 11, color: "var(--ink-2)" }}>{formatTime(duration)}</span>
        </div>

        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 36, marginTop: 18 }}>
          <button onClick={() => goTo(currentVerse - 1)} className="hh-btn ghost" aria-label="Previous ayah" style={{ padding: 0, width: 36, height: 36, justifyContent: "center" }}>
            <IcoBack s={18} />
          </button>
          <button
            onClick={togglePlay}
            aria-label={playing ? "Pause" : "Play"}
            style={{
              width: 56, height: 56, borderRadius: 28,
              background: "var(--ink-0)", color: "var(--paper-1)",
              border: 0, display: "flex", alignItems: "center", justifyContent: "center",
              cursor: "pointer",
            }}
          >
            {playing ? <IcoPause s={18} /> : <IcoPlay s={18} />}
          </button>
          <button onClick={() => goTo(currentVerse + 1)} className="hh-btn ghost" aria-label="Next ayah" style={{ padding: 0, width: 36, height: 36, justifyContent: "center" }}>
            <IcoFwd s={18} />
          </button>
        </div>

        {audioError && (
          <p style={{ color: "var(--fail)", fontSize: 11.5, textAlign: "center", margin: "14px 0 0" }}>
            Couldn&apos;t load audio for this ayah. Check your connection and try again.
          </p>
        )}
      </div>
    </div>
  );
}
