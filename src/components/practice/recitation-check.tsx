"use client";

// RecitationCheck — live recitation following via the Web Speech API.
//
// This exists to answer one question on real devices: can Web Speech follow
// recitation on an iPhone? Two modes, because the answer differs:
//
//   continuous — rec.continuous = true. Works on Chrome (desktop, Android).
//                On iOS this is documented to keep the mic open and never
//                return a final result, so the cursor should never move.
//   utterance  — rec.continuous = false, restarted on every `end`. One
//                recognition session per phrase. This is the only shape that
//                can work on iOS, and the cursor advances a phrase at a time.
//
// The diagnostics panel is not decoration. There is no console on a phone, so
// "has a final result EVER arrived" is rendered on screen: that single line is
// the experiment's result.

import { useCallback, useRef, useState, useSyncExternalStore } from "react";
import { Eyebrow } from "@/components/atoms";
import {
  matchLive,
  scoreOf,
  type ExpectedWord,
  type MatchState,
} from "@/lib/recitation";
import { RecitedVerse } from "./recited-verse";

/* ── Minimal Web Speech typings (not in lib.dom for all targets) ── */

interface SpeechAlternative {
  transcript: string;
}
interface SpeechResult {
  readonly length: number;
  isFinal: boolean;
  [index: number]: SpeechAlternative;
}
interface SpeechResultList {
  readonly length: number;
  [index: number]: SpeechResult;
}
interface SpeechEvent extends Event {
  results: SpeechResultList;
  resultIndex: number;
}
interface SpeechErrorEvent extends Event {
  error: string;
  message?: string;
}
interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult: ((e: SpeechEvent) => void) | null;
  onerror: ((e: SpeechErrorEvent) => void) | null;
}
type SpeechCtor = new () => SpeechRecognitionLike;

function getSpeechCtor(): { ctor: SpeechCtor | null; global: string | null } {
  if (typeof window === "undefined") return { ctor: null, global: null };
  const w = window as unknown as Record<string, SpeechCtor | undefined>;
  if (w.SpeechRecognition) return { ctor: w.SpeechRecognition, global: "SpeechRecognition" };
  if (w.webkitSpeechRecognition)
    return { ctor: w.webkitSpeechRecognition, global: "webkitSpeechRecognition" };
  return { ctor: null, global: null };
}

/* ── Environment, read on mount so the page reports itself before Start ── */

export interface SpeechEnv {
  known: boolean;
  apiGlobal: string | null;
  secure: boolean;
  ua: string;
  isAppleWebKit: boolean;
}

const SERVER_ENV: SpeechEnv = {
  known: false,
  apiGlobal: null,
  secure: false,
  ua: "",
  isAppleWebKit: false,
};

let cachedEnv: SpeechEnv | null = null;

function clientEnv(): SpeechEnv {
  if (!cachedEnv) {
    const { global } = getSpeechCtor();
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    cachedEnv = {
      known: true,
      apiGlobal: global,
      secure: typeof window !== "undefined" && window.isSecureContext,
      ua,
      // Every browser on iOS is WebKit, and desktop Safari shares the engine.
      isAppleWebKit: /AppleWebKit/.test(ua) && !/Chrome|Chromium|Edg\//.test(ua),
    };
  }
  return cachedEnv;
}

const subscribeNoop = () => () => {};

/* ── Diagnostics ── */

interface Diag {
  apiGlobal: string | null;
  secureContext: boolean;
  userAgent: string;
  sessions: number;
  resultEvents: number;
  finals: number;
  interims: number;
  everGotFinal: boolean;
  lastTranscript: string;
  lastError: string;
  startedAt: number;
}

const EMPTY_DIAG: Diag = {
  apiGlobal: null,
  secureContext: false,
  userAgent: "",
  sessions: 0,
  resultEvents: 0,
  finals: 0,
  interims: 0,
  everGotFinal: false,
  lastTranscript: "",
  lastError: "",
  startedAt: 0,
};

export type RecitationMode = "continuous" | "utterance";

interface RecitationCheckProps {
  words: ExpectedWord[];
  /** Fires once the cursor reaches the end. */
  onComplete?: (state: MatchState) => void;
}

const LANG = "ar-SA";

export function RecitationCheck({ words, onComplete }: RecitationCheckProps) {
  const env = useSyncExternalStore(subscribeNoop, clientEnv, () => SERVER_ENV);
  const [mode, setMode] = useState<RecitationMode>("utterance");
  const [waitMode, setWaitMode] = useState(true);
  const [listening, setListening] = useState(false);
  const [diag, setDiag] = useState<Diag>(EMPTY_DIAG);
  const [heard, setHeard] = useState("");
  const [state, setState] = useState<MatchState>(() => ({
    status: words.map(() => "pending" as const),
    cursor: 0,
    waiting: false,
    firstBad: null,
  }));
  const [revealed, setRevealed] = useState<ReadonlySet<number>>(new Set());

  const recRef = useRef<SpeechRecognitionLike | null>(null);
  const wantRef = useRef(false);
  const confirmedRef = useRef<string[]>([]);
  const sessionFinalRef = useRef<string[]>([]);
  const revealedRef = useRef<ReadonlySet<number>>(new Set());
  const waitModeRef = useRef(waitMode);
  const doneRef = useRef(false);

  waitModeRef.current = waitMode;

  const recompute = useCallback(
    (interim: string[]) => {
      const all = [...confirmedRef.current, ...sessionFinalRef.current, ...interim];
      setHeard(all.join(" "));
      const next = matchLive(words, all, waitModeRef.current, revealedRef.current);
      setState(next);
      if (next.cursor >= words.length && !doneRef.current) {
        doneRef.current = true;
        wantRef.current = false;
        recRef.current?.stop();
        onComplete?.(next);
      }
      return next;
    },
    [words, onComplete],
  );

  const spawn = useCallback(
    (ctor: SpeechCtor) => {
      const rec = new ctor();
      rec.lang = LANG;
      rec.continuous = mode === "continuous";
      rec.interimResults = true;
      rec.maxAlternatives = 1;
      sessionFinalRef.current = [];

      rec.onstart = () => {
        setListening(true);
        setDiag((d) => ({ ...d, sessions: d.sessions + 1 }));
      };

      rec.onresult = (ev) => {
        const finals: string[] = [];
        const interim: string[] = [];
        let sawFinal = false;
        for (let i = 0; i < ev.results.length; i++) {
          const r = ev.results[i];
          const t = (r[0]?.transcript ?? "").trim();
          if (!t) continue;
          if (r.isFinal) {
            sawFinal = true;
            finals.push(...t.split(/\s+/));
          } else {
            interim.push(...t.split(/\s+/));
          }
        }
        sessionFinalRef.current = finals.filter(Boolean);
        const interimWords = interim.filter(Boolean);
        setDiag((d) => ({
          ...d,
          resultEvents: d.resultEvents + 1,
          finals: d.finals + (sawFinal ? 1 : 0),
          interims: d.interims + (interimWords.length ? 1 : 0),
          everGotFinal: d.everGotFinal || sawFinal,
          lastTranscript: [...finals, ...interimWords].join(" ").slice(-120),
        }));
        recompute(interimWords);
      };

      rec.onerror = (e) => {
        // no-speech and aborted are normal during pauses; onend handles restart
        setDiag((d) => ({ ...d, lastError: `${e.error}${e.message ? `: ${e.message}` : ""}` }));
        if (e.error === "not-allowed" || e.error === "service-not-allowed") {
          wantRef.current = false;
          setListening(false);
        }
      };

      rec.onend = () => {
        setListening(false);
        if (sessionFinalRef.current.length) {
          confirmedRef.current = [...confirmedRef.current, ...sessionFinalRef.current];
          sessionFinalRef.current = [];
        }
        if (wantRef.current && !doneRef.current) {
          // Both modes restart. In utterance mode that restart IS the mechanism.
          try {
            const next = spawn(ctor);
            recRef.current = next;
            next.start();
          } catch {
            window.setTimeout(() => {
              if (!wantRef.current) return;
              try {
                const next = spawn(ctor);
                recRef.current = next;
                next.start();
              } catch {
                /* give up quietly; the panel shows the last error */
              }
            }, 300);
          }
        }
      };

      return rec;
    },
    [mode, recompute],
  );

  const start = useCallback(() => {
    const { ctor, global } = getSpeechCtor();
    const secure = typeof window !== "undefined" && window.isSecureContext;
    setDiag({
      ...EMPTY_DIAG,
      apiGlobal: global,
      secureContext: secure,
      userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      startedAt: Date.now(),
      lastError: !global
        ? "No Web Speech API on this browser."
        : !secure
          ? "Not a secure context. Serve over HTTPS or localhost."
          : "",
    });
    if (!ctor || !secure) return;

    confirmedRef.current = [];
    sessionFinalRef.current = [];
    doneRef.current = false;
    wantRef.current = true;
    setHeard("");
    try {
      const rec = spawn(ctor);
      recRef.current = rec;
      rec.start();
    } catch (err) {
      setDiag((d) => ({ ...d, lastError: String(err) }));
    }
  }, [spawn]);

  const stop = useCallback(() => {
    wantRef.current = false;
    recRef.current?.stop();
    setListening(false);
  }, []);

  const reset = useCallback(() => {
    wantRef.current = false;
    recRef.current?.abort();
    confirmedRef.current = [];
    sessionFinalRef.current = [];
    doneRef.current = false;
    revealedRef.current = new Set();
    setRevealed(new Set());
    setListening(false);
    setHeard("");
    setDiag(EMPTY_DIAG);
    setState({
      status: words.map(() => "pending" as const),
      cursor: 0,
      waiting: false,
      firstBad: null,
    });
  }, [words]);

  const reveal = useCallback(
    (index: number) => {
      const next = new Set(revealedRef.current);
      next.add(index);
      revealedRef.current = next;
      setRevealed(next);
      recompute([]);
    },
    [recompute],
  );

  const score = scoreOf(state);
  const started = diag.startedAt > 0;
  const complete = state.cursor >= words.length;
  const progress = words.length ? Math.round((state.cursor / words.length) * 100) : 0;

  const blocked = env.known && (!env.apiGlobal || !env.secure);

  return (
    <div>
      {blocked && (
        <div
          style={{
            padding: "14px 16px",
            marginBottom: 18,
            background: "var(--paper-3)",
            borderLeft: "3px solid var(--fail)",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <strong>This browser can&apos;t start speech recognition.</strong>
          <ul style={{ margin: "8px 0 0", paddingInlineStart: 20 }}>
            {!env.secure && (
              <li>
                <strong>Not a secure context.</strong> Speech recognition needs HTTPS or
                localhost. A plain <code>http://192.168.x.x</code> address will never work —
                use an HTTPS tunnel.
              </li>
            )}
            {!env.apiGlobal && (
              <li>
                <strong>No Web Speech API found.</strong>{" "}
                {env.isAppleWebKit ? (
                  <>
                    Safari only exposes it when <strong>Siri or Dictation is enabled</strong> in
                    system settings. On iPhone: Settings → General → Keyboard → Enable
                    Dictation. On Mac: System Settings → Keyboard → Dictation. Then reload this
                    page.
                  </>
                ) : (
                  <>This browser has no speech recognition. Try Chrome or Safari.</>
                )}
              </li>
            )}
          </ul>
        </div>
      )}

      <RecitedVerse
        words={words}
        status={state.status}
        cursor={state.cursor}
        waiting={state.waiting}
        onReveal={reveal}
      />

      {/* Status line */}
      <div style={{ margin: "16px 0 10px", fontSize: 13, color: "var(--ink-1)", minHeight: 20 }}>
        {complete ? (
          <strong style={{ color: "var(--pass)" }}>Recitation complete.</strong>
        ) : state.waiting ? (
          <>
            Waiting on{" "}
            <span className="hh-arabic" style={{ fontSize: 20, direction: "rtl" }}>
              {words[state.cursor]?.plain}
            </span>{" "}
            — say that word again, or tap it to reveal.
          </>
        ) : listening ? (
          <>
            Listening… {state.cursor}/{words.length} words ({progress}%)
          </>
        ) : (
          "Press Start and recite."
        )}
      </div>

      {/* Controls */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
        <button className="hh-btn primary" onClick={listening ? stop : start}>
          {listening ? "Stop" : "Start reciting"}
        </button>
        <button className="hh-btn ghost" onClick={reset}>
          Reset
        </button>
        <button
          className="hh-btn ghost"
          onClick={() => setMode((m) => (m === "continuous" ? "utterance" : "continuous"))}
          disabled={listening}
        >
          Mode: {mode === "continuous" ? "continuous" : "per-utterance"}
        </button>
        <button className="hh-btn ghost" onClick={() => setWaitMode((v) => !v)}>
          {waitMode ? "Wait on mistakes: on" : "Wait on mistakes: off"}
        </button>
      </div>

      <p style={{ fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 20px" }}>
        <strong>continuous</strong> is the Chrome path. <strong>per-utterance</strong> restarts
        recognition after every phrase and is the only shape that can work on iOS. Switch modes
        while stopped and compare the panel below.
      </p>

      {/* Diagnostics */}
      <div style={{ borderTop: "1px solid var(--rule-1)", paddingTop: 16 }}>
        <Eyebrow>Diagnostics</Eyebrow>

        <div
          style={{
            margin: "10px 0 14px",
            padding: "12px 14px",
            background: diag.everGotFinal ? "var(--paper-3)" : "var(--paper-2)",
            borderLeft: `3px solid ${diag.everGotFinal ? "var(--pass)" : "var(--partial)"}`,
            fontSize: 13,
          }}
        >
          <strong>Final result ever received: {diag.everGotFinal ? "YES" : "no"}</strong>
          <div style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 4, lineHeight: 1.5 }}>
            {diag.everGotFinal
              ? "The recognizer is finalizing speech, so the cursor can advance."
              : started
                ? "If this stays “no” on iPhone in continuous mode while words are being heard, that is the documented iOS failure. Switch to per-utterance and try again."
                : "Press Start, recite, and watch this line. It is the whole experiment."}
          </div>
        </div>

        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "6px 14px",
            fontSize: 12,
            margin: 0,
          }}
        >
          <Row
            k="API global"
            v={!env.known ? "checking…" : (env.apiGlobal ?? "none — see banner above")}
            bad={env.known && !env.apiGlobal}
          />
          <Row
            k="Secure context"
            v={!env.known ? "checking…" : env.secure ? "yes" : "NO — mic will be blocked"}
            bad={env.known && !env.secure}
          />
          <Row k="Engine" v={!env.known ? "checking…" : env.isAppleWebKit ? "WebKit (Safari)" : "non-WebKit"} />
          <Row k="Mode" v={mode} />
          <Row k="Language" v={LANG} />
          <Row k="Sessions started" v={String(diag.sessions)} />
          <Row k="onresult events" v={String(diag.resultEvents)} />
          <Row k="Final results" v={String(diag.finals)} />
          <Row k="Interim results" v={String(diag.interims)} />
          <Row k="Cursor" v={`${state.cursor} / ${words.length}`} />
          <Row
            k="Score"
            v={`${score.correct} correct · ${score.wrong} wrong · ${score.tashkeel} tashkeel · ${score.revealed} revealed`}
          />
          <Row k="Last error" v={diag.lastError || "none"} bad={!!diag.lastError} />
        </dl>

        <div style={{ marginTop: 14 }}>
          <Eyebrow>Last transcript</Eyebrow>
          <div
            className="hh-arabic"
            style={{
              direction: "rtl",
              fontSize: 17,
              minHeight: 28,
              padding: "8px 10px",
              background: "var(--paper-2)",
              marginTop: 6,
              wordBreak: "break-word",
            }}
          >
            {diag.lastTranscript || "—"}
          </div>
        </div>

        <div style={{ marginTop: 12 }}>
          <Eyebrow>Everything heard</Eyebrow>
          <div
            className="hh-arabic"
            style={{
              direction: "rtl",
              fontSize: 15,
              minHeight: 24,
              padding: "8px 10px",
              background: "var(--paper-2)",
              marginTop: 6,
              maxHeight: 120,
              overflow: "auto",
              wordBreak: "break-word",
            }}
          >
            {heard || "—"}
          </div>
        </div>

        {revealed.size > 0 && (
          <p style={{ fontSize: 11.5, color: "var(--ink-2)", marginTop: 12 }}>
            Revealed {revealed.size} word{revealed.size === 1 ? "" : "s"}.
          </p>
        )}

        {diag.userAgent && (
          <p
            style={{
              fontSize: 10.5,
              color: "var(--ink-3)",
              marginTop: 14,
              lineHeight: 1.5,
              wordBreak: "break-word",
            }}
          >
            {diag.userAgent}
          </p>
        )}
      </div>
    </div>
  );
}

function Row({ k, v, bad }: { k: string; v: string; bad?: boolean }) {
  return (
    <>
      <dt style={{ color: "var(--ink-2)", whiteSpace: "nowrap" }}>{k}</dt>
      <dd
        style={{
          margin: 0,
          color: bad ? "var(--fail)" : "var(--ink-0)",
          wordBreak: "break-word",
        }}
      >
        {v}
      </dd>
    </>
  );
}
