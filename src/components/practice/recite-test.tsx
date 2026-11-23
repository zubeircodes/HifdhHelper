"use client";

// ReciteTest — recite the selected ayat from memory (experimental).
//
// Words start hidden and appear only once recited correctly. After a wrong
// attempt the student can retry or ask to see the word. The end screen lists
// every word that was not right first time, grouped by ayah, with a score.
//
// Recognition runs on-device (src/lib/ctc): a 241 MB model downloaded once and
// cached. Audio never leaves the device.
//
// Debug: ?reciteDebug=1 shows engine timings under the controls (use it when
// trying a new phone). ?reciteSimulate=1 also feeds the reciter's audio into the
// recognizer instead of the microphone.

import { useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { Eyebrow, VerseMark } from "@/components/atoms";
import { expectedWordsFromVerses, type ExpectedWord } from "@/lib/recitation";
import {
  initialTest,
  hear,
  reveal,
  finish,
  isFailed,
  scoreTest,
  scoreLabel,
  type TestState,
  type WordOutcome,
} from "@/lib/recite-test";
import {
  engineStatus,
  subscribe,
  isModelCached,
  loadModel,
  listen,
  type EngineStatus,
  type EngineStats,
  type ListenerSession,
} from "@/lib/ctc/engine";
import { MODEL_MB } from "@/lib/ctc/config";
import { getAudioUrl } from "@/lib/audio";
import { getSurah } from "@/lib/quran-meta";
import type { LoopVerse } from "./use-verse-loop";

interface ReciteTestProps {
  verses: LoopVerse[];
  reciter: string;
  rangeLabel: string;
  onExit: () => void;
  embedded?: boolean;
}

const IDLE: EngineStatus = { phase: "idle" };

/** Seconds of unprocessed audio before telling the student their device can't keep up. */
const LAG_WARN_SEC = 3;

function urlFlag(name: string): boolean {
  return typeof window !== "undefined" && new URLSearchParams(window.location.search).has(name);
}

export function ExperimentalBadge() {
  return (
    <span
      style={{
        fontSize: 9.5,
        fontWeight: 600,
        letterSpacing: "0.12em",
        textTransform: "uppercase",
        color: "var(--partial)",
        border: "1px solid currentColor",
        borderRadius: 999,
        padding: "2px 7px",
        lineHeight: 1.3,
        whiteSpace: "nowrap",
      }}
    >
      Experimental
    </span>
  );
}

const OUTCOME_STYLE: Record<WordOutcome, React.CSSProperties> = {
  pending: {},
  correct: { color: "var(--ink-0)" },
  retried: { color: "var(--partial)" },
  revealed: { color: "var(--fail)", textDecoration: "underline dotted", textUnderlineOffset: 8 },
  skipped: { color: "var(--fail)", textDecoration: "underline dotted", textUnderlineOffset: 8 },
  unreached: { color: "var(--ink-3)" },
};

function outcomeNote(o: WordOutcome, heard: string[]): string {
  const tries = heard.length ? `${heard.length} wrong ${heard.length === 1 ? "try" : "tries"}` : "";
  switch (o) {
    case "retried": return `Got it after ${tries}`;
    case "revealed": return tries ? `Shown after ${tries}` : "Shown";
    case "skipped": return "Skipped";
    case "unreached": return "Not reached";
    default: return "";
  }
}

function errorMessage(e: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "The microphone only works over a secure (https) connection.";
  }
  const name = e instanceof DOMException ? e.name : "";
  if (name === "NotAllowedError") return "Microphone access was blocked. Allow it for this site in your browser settings, then try again.";
  if (name === "NotFoundError") return "No microphone found.";
  return e instanceof Error ? e.message : String(e);
}

export function ReciteTest({ verses, reciter, rangeLabel, onExit, embedded = false }: ReciteTestProps) {
  const expected = useMemo(() => expectedWordsFromVerses(verses), [verses]);
  const engine = useSyncExternalStore(subscribe, engineStatus, () => IDLE);
  const [cached, setCached] = useState<boolean | null>(null);
  const [test, setTest] = useState<TestState>(() => initialTest(expected.length));
  const [started, setStarted] = useState(false);
  const [listening, setListening] = useState(false);
  const [partial, setPartial] = useState("");
  const [error, setError] = useState("");
  const [stats, setStats] = useState<EngineStats | null>(null);
  const [showStats, setShowStats] = useState(false);
  const sessionRef = useRef<ListenerSession | null>(null);

  useEffect(() => {
    let live = true;
    isModelCached().then((c) => live && setCached(c));
    return () => { live = false; };
  }, []);

  // A cached model loads in a few seconds; start preparing it straight away.
  useEffect(() => {
    if (cached) loadModel();
  }, [cached]);

  function stopListening() {
    sessionRef.current?.stop();
    sessionRef.current = null;
    setListening(false);
    setPartial("");
  }

  useEffect(() => () => sessionRef.current?.stop(), []);

  // The last word ends the test. Only the session is touched here; the results
  // view does not read `listening`, and restart() resets it.
  useEffect(() => {
    if (!test.done) return;
    sessionRef.current?.stop();
    sessionRef.current = null;
  }, [test.done]);

  async function startListening() {
    setError("");
    try {
      const simulate = urlFlag("reciteSimulate")
        ? verses.map((v) => getAudioUrl(reciter, v.surah, v.verse))
        : undefined;
      const debug = simulate || urlFlag("reciteDebug");
      sessionRef.current = await listen({
        simulate,
        onWord: (w) => {
          if (debug) {
            const win = window as unknown as { __hhReciteWords?: string[] };
            (win.__hhReciteWords ??= []).push(w.text);
          }
          setTest((s) => hear(s, expected, w.text));
        },
        onPartial: setPartial,
        onError: (m) => setError(m),
        onStats: (st) => {
          setStats(st);
          if (!debug) return;
          // Full timeline for inspection from the console or a test driver.
          const w = window as unknown as { __hhReciteStats?: (EngineStats & { at: number })[] };
          (w.__hhReciteStats ??= []).push({ ...st, at: Math.round(performance.now()) });
        },
      });
      setShowStats(!!debug);
      if (debug) (window as unknown as { __hhRecitePeek?: () => unknown }).__hhRecitePeek = () => sessionRef.current?.peek();
      setStarted(true);
      setListening(true);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  function restart() {
    stopListening();
    setTest(initialTest(expected.length));
    setStarted(false);
    setError("");
  }

  const pad = embedded ? "0" : "12px 22px";

  // ── Results ──
  if (test.done) {
    return (
      <Shell embedded={embedded} rangeLabel={rangeLabel} onExit={() => { stopListening(); onExit(); }}>
        <Results test={test} expected={expected} verses={verses} pad={pad} />
        <div style={{ display: "flex", gap: 10, padding: embedded ? "16px 0 0" : "16px 22px 18px", borderTop: "1px solid var(--rule-1)" }}>
          <button className="hh-btn primary lg" style={{ flex: 1, justifyContent: "center" }} onClick={restart}>
            Test again
          </button>
          <button className="hh-btn lg" style={{ flex: 1, justifyContent: "center" }} onClick={onExit}>
            Back to listening
          </button>
        </div>
      </Shell>
    );
  }

  // ── Before the test: download, prepare, start ──
  if (!started) {
    const ready = engine.phase === "ready";
    return (
      <Shell embedded={embedded} rangeLabel={rangeLabel} onExit={onExit}>
        <div style={{ padding: pad, flex: "1 1 auto", overflow: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "4px 0 10px" }}>
            <div className="hh-display" style={{ fontSize: 24 }}>Test yourself</div>
          </div>
          <p style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--ink-1)", margin: "0 0 16px" }}>
            Recite {rangeLabel} from memory. The words stay hidden and appear as you recite each
            one correctly. If you get stuck, you can show the next word.
          </p>
          <ul style={{ fontSize: 12.5, lineHeight: 1.7, color: "var(--ink-2)", margin: "0 0 22px", paddingLeft: 18, listStyle: "disc" }}>
            <li>Listening runs on your device. Your voice is never uploaded.</li>
            <li>Needs a one-time {MODEL_MB} MB download. Wi-Fi recommended.</li>
            <li>
              This is experimental. It checks that you recite the right words in the right order. It
              can mishear words, especially with background noise, and it doesn&apos;t yet catch small
              slips within a word, such as one wrong letter or vowel.
            </li>
          </ul>

          <EngineProgress engine={engine} cached={cached} />

          {error && <p style={{ color: "var(--fail)", fontSize: 12.5, margin: "12px 0 0" }}>{error}</p>}
        </div>

        <div style={{ padding: embedded ? "16px 0 0" : "16px 22px 18px", borderTop: "1px solid var(--rule-1)" }}>
          {ready ? (
            <button className="hh-btn primary lg" style={{ width: "100%", justifyContent: "center" }} onClick={startListening}>
              Start reciting
            </button>
          ) : engine.phase === "idle" || engine.phase === "error" ? (
            <button
              className="hh-btn primary lg"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={loadModel}
              disabled={cached === null}
            >
              {cached ? "Prepare" : engine.phase === "error" ? "Try the download again" : `Download speech model (${MODEL_MB} MB)`}
            </button>
          ) : (
            <button className="hh-btn lg" style={{ width: "100%", justifyContent: "center" }} onClick={onExit}>
              Keep listening while it downloads
            </button>
          )}
        </div>
      </Shell>
    );
  }

  // ── During the test ──
  const current = expected[test.cursor];
  const verseIdx = current ? verses.findIndex((v) => v.surah === current.surah && v.verse === current.verse) : -1;

  return (
    <Shell embedded={embedded} rangeLabel={rangeLabel} onExit={() => { stopListening(); onExit(); }}>
      <div className="hh-practice-verses" style={{ flex: "1 1 auto", padding: pad, overflow: "auto", minHeight: 0 }}>
        <HiddenText expected={expected} test={test} verses={verses} listening={listening} />
      </div>

      <div style={{ flex: "0 0 auto", padding: embedded ? "16px 0 0" : "16px 22px 18px", borderTop: "1px solid var(--rule-1)", marginTop: embedded ? 12 : 0 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <Eyebrow>Ayah {verseIdx + 1} of {verses.length}</Eyebrow>
          <span style={{ fontSize: 11, color: listening ? "var(--sage-deep)" : "var(--ink-2)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            {listening ? (partial ? <>Hearing <span className="hh-arabic" style={{ fontSize: 13, lineHeight: 1 }}>{partial}</span></> : "Listening…") : "Paused"}
          </span>
        </div>

        {test.lastWrong ? (
          <div role="status" style={{ marginTop: 12, padding: "10px 12px", background: "var(--paper-3)", borderLeft: "2px solid var(--fail)" }}>
            <div style={{ fontSize: 12.5, color: "var(--ink-1)" }}>
              Not quite. Heard <span className="hh-arabic" style={{ fontSize: 16, lineHeight: 1 }}>{test.lastWrong}</span>.
              Try again, or show the word.
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
              <button className="hh-btn primary sm" onClick={() => setTest(reveal)}>Show word</button>
              <button className="hh-btn sm" onClick={() => setTest((s) => ({ ...s, lastWrong: null }))}>Try again</button>
            </div>
          </div>
        ) : null}

        {error && <p style={{ color: "var(--fail)", fontSize: 12, margin: "10px 0 0" }}>{error}</p>}

        {stats && stats.behindSec > LAG_WARN_SEC && (
          <p style={{ fontSize: 12, color: "var(--partial)", margin: "10px 0 0" }}>
            This device is falling behind, so words will appear late. It works best on a recent phone
            or computer.
          </p>
        )}

        {stats && showStats && (
          <p className="hh-num" data-recite-stats style={{ fontSize: 10.5, color: "var(--ink-3)", margin: "10px 0 0" }}>
            {engine.phase === "ready" ? (engine.backend === "webgpu" ? "GPU" : "CPU") : ""} · run {stats.runMs} ms ·
            window {stats.windowSec.toFixed(1)} s · behind {stats.behindSec.toFixed(1)} s ·
            level {stats.level.toFixed(3)} {stats.level < stats.speechThreshold ? "(silence)" : ""}
          </p>
        )}

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            className="hh-btn"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={listening ? stopListening : startListening}
          >
            {listening ? "Pause" : "Resume"}
          </button>
          {!test.lastWrong && (
            <button className="hh-btn" style={{ flex: 1, justifyContent: "center" }} onClick={() => setTest(reveal)}>
              Show word
            </button>
          )}
          <button
            className="hh-btn"
            style={{ flex: 1, justifyContent: "center" }}
            onClick={() => { stopListening(); setTest(finish); }}
          >
            Finish
          </button>
        </div>
      </div>
    </Shell>
  );
}

/* ── Pieces ── */

function Shell({
  embedded, rangeLabel, onExit, children,
}: { embedded: boolean; rangeLabel: string; onExit: () => void; children: React.ReactNode }) {
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
        <button onClick={onExit} className="hh-btn ghost" style={{ padding: 0, fontSize: 12, color: "var(--ink-1)" }}>
          ← Listen
        </button>
        <span className="hh-eyebrow" style={{ flex: "1 1 auto", textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
          Test · {rangeLabel}
        </span>
        <ExperimentalBadge />
      </div>
      {children}
    </div>
  );
}

function EngineProgress({ engine, cached }: { engine: EngineStatus; cached: boolean | null }) {
  if (engine.phase === "downloading") {
    const pct = Math.round((engine.loaded / engine.total) * 100);
    return (
      <div>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5, color: "var(--ink-2)", marginBottom: 6 }}>
          <span>Downloading speech model</span>
          <span className="hh-num">{Math.round(engine.loaded / 1e6)} / {Math.round(engine.total / 1e6)} MB</span>
        </div>
        <div style={{ height: 3, background: "var(--rule-2)", borderRadius: 2 }} role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div style={{ height: "100%", width: `${pct}%`, background: "var(--ink-0)", transition: "width 0.2s" }} />
        </div>
        <p style={{ fontSize: 11.5, color: "var(--ink-3)", margin: "8px 0 0" }}>
          You can go back and keep listening. The download carries on.
        </p>
      </div>
    );
  }
  if (engine.phase === "preparing") {
    return <p style={{ fontSize: 12.5, color: "var(--ink-2)", margin: 0 }}>Preparing the speech model…</p>;
  }
  if (engine.phase === "ready") {
    return (
      <p style={{ fontSize: 12.5, color: "var(--sage-deep)", margin: 0 }}>
        Ready. Tap start, then begin reciting from the first word.
        {engine.backend !== "webgpu" && (
          <span style={{ display: "block", color: "var(--partial)", marginTop: 6 }}>
            This browser isn&apos;t giving the speech model access to the graphics chip, so it will be
            slow here and words will appear well after you say them. A recent iPhone (iOS 26) or
            Android phone with Chrome works best.
          </span>
        )}
      </p>
    );
  }
  if (engine.phase === "error") {
    return <p style={{ fontSize: 12.5, color: "var(--fail)", margin: 0 }}>Couldn&apos;t load the speech model: {engine.message}</p>;
  }
  return cached ? <p style={{ fontSize: 12.5, color: "var(--ink-2)", margin: 0 }}>Model already downloaded.</p> : null;
}

/** Recited words, verse by verse, with a marker where the next word goes. Nothing ahead is shown. */
function HiddenText({
  expected, test, verses, listening,
}: { expected: ExpectedWord[]; test: TestState; verses: LoopVerse[]; listening: boolean }) {
  const current = expected[test.cursor];
  const markerRef = useRef<HTMLSpanElement>(null);

  // Keep the next word in view as the text grows past the bottom of the box.
  useEffect(() => {
    const marker = markerRef.current;
    const box = marker?.closest<HTMLElement>(".hh-practice-verses");
    if (!marker || !box) return;
    const m = marker.getBoundingClientRect();
    const b = box.getBoundingClientRect();
    if (m.top >= b.top && m.bottom <= b.bottom - b.height / 3) return;
    box.scrollTo({ top: box.scrollTop + m.top - b.top - b.height * 0.4, behavior: "smooth" });
  }, [test.cursor]);

  return (
    <div>
      {verses.map((v) => {
        const idx = expected.map((_, i) => i).filter((i) => expected[i].surah === v.surah && expected[i].verse === v.verse);
        const shown = idx.filter((i) => i < test.cursor);
        const isCurrent = current && current.surah === v.surah && current.verse === v.verse;
        if (!shown.length && !isCurrent) return null;
        const complete = shown.length === idx.length;
        return (
          <div key={`${v.surah}:${v.verse}`} style={{ padding: "var(--space-md)", borderBottom: "1px solid var(--rule-1)" }}>
            <div className="hh-arabic" style={{ fontSize: "1.8rem", minHeight: "3.2em" }}>
              {shown.map((i) => (
                <span key={i}>
                  <span style={OUTCOME_STYLE[test.words[i].outcome]} dangerouslySetInnerHTML={{ __html: expected[i].html }} />{" "}
                </span>
              ))}
              {complete ? (
                <VerseMark n={v.verse} size={24} />
              ) : (
                <span
                  ref={markerRef}
                  aria-label="Next word"
                  style={{
                    display: "inline-block",
                    width: "1.6em",
                    height: "0.08em",
                    background: test.lastWrong ? "var(--fail)" : "var(--ink-3)",
                    verticalAlign: "middle",
                    animation: listening ? "hh-pulse 1.4s ease-in-out infinite" : undefined,
                  }}
                />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Results({
  test, expected, verses, pad,
}: { test: TestState; expected: ExpectedWord[]; verses: LoopVerse[]; pad: string }) {
  const score = scoreTest(test);
  const firstAyah = verses[0];
  const surahName = firstAyah ? getSurah(firstAyah.surah)?.name : "";

  return (
    <div style={{ flex: "1 1 auto", overflow: "auto", minHeight: 0, padding: pad }}>
      <div style={{ textAlign: "center", padding: "8px 0 20px" }}>
        <div className="hh-display hh-num" style={{ fontSize: 56, lineHeight: 1 }}>{score.percent}%</div>
        <div style={{ fontSize: 14, color: "var(--ink-1)", marginTop: 8 }}>{scoreLabel(score.percent)}</div>
        <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 10, lineHeight: 1.7 }}>
          {score.correct} of {score.total} words right first time
          {score.retried > 0 && <> · {score.retried} after a retry</>}
          {score.revealed > 0 && <> · {score.revealed} shown</>}
          {score.skipped > 0 && <> · {score.skipped} skipped</>}
          {score.unreached > 0 && <> · {score.unreached} not reached</>}
        </div>
        <div style={{ fontSize: 11, color: "var(--ink-3)", marginTop: 8 }}>
          Full marks first time, half after a retry, none when shown or skipped.
        </div>
      </div>

      {verses.map((v) => {
        const idx = expected.map((_, i) => i).filter((i) => expected[i].surah === v.surah && expected[i].verse === v.verse);
        const failed = idx.filter((i) => isFailed(test.words[i].outcome));
        const allUnreached = idx.every((i) => test.words[i].outcome === "unreached");
        return (
          <div key={`${v.surah}:${v.verse}`} style={{ padding: "14px 0", borderTop: "1px solid var(--rule-1)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
              <span className="hh-eyebrow">{surahName} {v.surah}:{v.verse}</span>
              <span style={{ fontSize: 11.5, color: failed.length ? "var(--fail)" : "var(--pass)" }}>
                {allUnreached ? "Not reached" : failed.length ? `${failed.length} to review` : "All correct"}
              </span>
            </div>
            {!allUnreached && (
              <div className="hh-arabic" style={{ fontSize: "1.5rem", lineHeight: 2.4 }}>
                {idx.map((i) => (
                  <span key={i}>
                    <span
                      style={isFailed(test.words[i].outcome) ? OUTCOME_STYLE[test.words[i].outcome] : { color: "var(--ink-1)" }}
                      dangerouslySetInnerHTML={{ __html: expected[i].html }}
                    />{" "}
                  </span>
                ))}
              </div>
            )}
            {!allUnreached && failed.length > 0 && (
              <ul style={{ listStyle: "none", padding: 0, margin: "4px 0 0", display: "grid", gap: 6 }}>
                {failed.map((i) => {
                  const w = test.words[i];
                  return (
                    <li key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, fontSize: 12, color: "var(--ink-2)" }}>
                      <span>
                        {outcomeNote(w.outcome, w.heard)}
                        {w.heard.length > 0 && (
                          <> · heard <span className="hh-arabic" style={{ fontSize: 15, lineHeight: 1 }}>{w.heard.join("، ")}</span></>
                        )}
                      </span>
                      <span className="hh-arabic" style={{ fontSize: 20, lineHeight: 1.4, color: "var(--ink-0)" }} dangerouslySetInnerHTML={{ __html: expected[i].html }} />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
