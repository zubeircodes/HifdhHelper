"use client";

// VoskRecitationCheck — live recitation following via Kaldi (vosk-browser, WASM).
//
// The point of this engine over Web Speech: it is grammar-constrained. We know
// the ayah, so the recognizer's search graph is replaced by one built from just
// those words, which collapses the search from tens of thousands of candidates
// to tens. It also runs entirely on-device, identically on every platform,
// since it is only WASM — no Apple or Google speech service involved.
//
// Cost: the acoustic model is a 158-318 MB download. Fetch one first with
//   ./scripts/fetch-vosk-model.sh
//
// vosk-browser is imported dynamically. Its bundle inlines the WASM and is
// ~5.8 MB, which has no business in the page's initial payload.

import { useCallback, useRef, useState } from "react";
import { Eyebrow } from "@/components/atoms";
import {
  matchLive,
  scoreOf,
  type ExpectedWord,
  type MatchState,
} from "@/lib/recitation";
import { RecitedVerse } from "./recited-verse";

/* ── Models, as produced by scripts/fetch-vosk-model.sh ── */

export interface VoskModelOption {
  key: string;
  label: string;
  file: string;
  note: string;
}

export const VOSK_MODELS: VoskModelOption[] = [
  {
    key: "ar-mgb2",
    label: "Arabic · MSA (318 MB)",
    file: "/models/vosk-model-ar-mgb2-0.4.tar.gz",
    note: "Modern Standard Arabic, trained on broadcast news. The real candidate.",
  },
  {
    key: "ar-tn",
    label: "Arabic · Tunisian (158 MB)",
    file: "/models/vosk-model-small-ar-tn-0.1-linto.tar.gz",
    note: "Lighter, but a dialect model. Useful for testing memory limits.",
  },
  {
    key: "en-small",
    label: "English (40 MB)",
    file: "/models/vosk-model-small-en-us-0.15.tar.gz",
    note: "Won't match Arabic. Only proves the pipeline loads and runs.",
  },
];

/* ── Minimal vosk-browser typings, matching dist/model.d.ts ── */

interface VoskResultMessage {
  result?: { text?: string; partial?: string };
}
interface VoskRecognizer {
  on(event: string, listener: (message: VoskResultMessage) => void): void;
  setWords(words: boolean): void;
  acceptWaveform(buffer: AudioBuffer): void;
  remove(): void;
}
interface VoskModel {
  KaldiRecognizer: new (sampleRate: number, grammar?: string) => VoskRecognizer;
  terminate(): void;
}

type Phase = "idle" | "loading-model" | "ready" | "listening" | "error";

interface Diag {
  phase: Phase;
  modelMs: number;
  grammarWords: number;
  partials: number;
  finals: number;
  lastPartial: string;
  lastFinal: string;
  sampleRate: number;
  grammarApplied: boolean;
  lastError: string;
}

const EMPTY_DIAG: Diag = {
  phase: "idle",
  modelMs: 0,
  grammarWords: 0,
  partials: 0,
  finals: 0,
  lastPartial: "",
  lastFinal: "",
  sampleRate: 0,
  grammarApplied: false,
  lastError: "",
};

interface VoskRecitationCheckProps {
  words: ExpectedWord[];
}

export function VoskRecitationCheck({ words }: VoskRecitationCheckProps) {
  const [modelKey, setModelKey] = useState(VOSK_MODELS[0].key);
  const [useGrammar, setUseGrammar] = useState(true);
  const [waitMode, setWaitMode] = useState(true);
  const [diag, setDiag] = useState<Diag>(EMPTY_DIAG);
  const [heard, setHeard] = useState("");
  const [state, setState] = useState<MatchState>(() => ({
    status: words.map(() => "pending" as const),
    cursor: 0,
    waiting: false,
    firstBad: null,
  }));
  const [revealed, setRevealed] = useState<ReadonlySet<number>>(new Set());

  const modelRef = useRef<VoskModel | null>(null);
  const recRef = useRef<VoskRecognizer | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nodesRef = useRef<AudioNode[]>([]);
  const confirmedRef = useRef<string[]>([]);
  const revealedRef = useRef<ReadonlySet<number>>(new Set());
  const waitModeRef = useRef(waitMode);
  waitModeRef.current = waitMode;

  const recompute = useCallback(
    (partial: string[]) => {
      const all = [...confirmedRef.current, ...partial];
      setHeard(all.join(" "));
      setState(matchLive(words, all, waitModeRef.current, revealedRef.current));
    },
    [words],
  );

  const teardown = useCallback(() => {
    nodesRef.current.forEach((n) => n.disconnect());
    nodesRef.current = [];
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close().catch(() => {});
    ctxRef.current = null;
    recRef.current?.remove();
    recRef.current = null;
  }, []);

  const start = useCallback(async () => {
    const model = VOSK_MODELS.find((m) => m.key === modelKey)!;
    setDiag({ ...EMPTY_DIAG, phase: "loading-model" });
    confirmedRef.current = [];
    setHeard("");

    try {
      // Grammar: the words of this passage only. Both spellings go in, because
      // the model's lexicon is Modern Standard Arabic while the mushaf uses the
      // dagger alef — offering only the Quranic form misses words like sirat.
      // Measured against this model's 957,745-entry lexicon, both forms give
      // every test passage full coverage where one form gives 90%.
      // [unk] must be present or anything outside the list is unrepresentable.
      const vocab = Array.from(
        new Set(words.flatMap((w) => [w.norm, w.altNorm])),
      ).filter(Boolean);
      const grammar = JSON.stringify([...vocab, "[unk]"]);

      const t0 = performance.now();
      const { createModel } = await import("vosk-browser");
      const loaded = (await createModel(model.file)) as unknown as VoskModel;
      modelRef.current = loaded;
      const modelMs = Math.round(performance.now() - t0);

      // Report the heavy part immediately. If the microphone then fails, we
      // still know whether the model downloaded and initialised — on a phone
      // that is the difference between "too big" and "mic blocked".
      setDiag((d) => ({ ...d, phase: "ready", modelMs, grammarWords: vocab.length }));

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true },
      });
      streamRef.current = stream;

      const ctx = new AudioContext();
      ctxRef.current = ctx;

      // A grammar containing words outside the model's lexicon can be rejected
      // outright. Falling back to open recognition is far better than failing.
      let grammarApplied = useGrammar;
      let recognizer: VoskRecognizer;
      try {
        recognizer = new loaded.KaldiRecognizer(
          ctx.sampleRate,
          useGrammar ? grammar : undefined,
        );
      } catch (grammarErr) {
        grammarApplied = false;
        recognizer = new loaded.KaldiRecognizer(ctx.sampleRate);
        setDiag((d) => ({
          ...d,
          lastError: `Grammar rejected, running open: ${String(grammarErr)}`,
        }));
      }
      recognizer.setWords(true);
      recRef.current = recognizer;

      recognizer.on("partialresult", (msg) => {
        const partial = (msg.result?.partial ?? "").trim();
        setDiag((d) => ({ ...d, partials: d.partials + 1, lastPartial: partial }));
        recompute(partial ? partial.split(/\s+/) : []);
      });

      recognizer.on("result", (msg) => {
        const text = (msg.result?.text ?? "").trim();
        if (text) confirmedRef.current = [...confirmedRef.current, ...text.split(/\s+/)];
        setDiag((d) => ({ ...d, finals: d.finals + 1, lastFinal: text }));
        recompute([]);
      });

      const source = ctx.createMediaStreamSource(stream);
      const processor = ctx.createScriptProcessor(4096, 1, 1);
      processor.onaudioprocess = (e) => {
        try {
          recRef.current?.acceptWaveform(e.inputBuffer);
        } catch {
          /* a late buffer after teardown; ignore */
        }
      };
      // ScriptProcessor only runs while connected to the graph, but routing the
      // mic to the speakers would howl. Mute it with a zero gain.
      const mute = ctx.createGain();
      mute.gain.value = 0;
      source.connect(processor);
      processor.connect(mute);
      mute.connect(ctx.destination);
      nodesRef.current = [source, processor, mute];

      setDiag((d) => ({
        ...d,
        phase: "listening",
        modelMs,
        grammarWords: vocab.length,
        sampleRate: ctx.sampleRate,
        grammarApplied,
      }));
    } catch (err) {
      teardown();
      setDiag((d) => ({ ...d, phase: "error", lastError: String(err) }));
    }
  }, [modelKey, useGrammar, words, recompute, teardown]);

  const stop = useCallback(() => {
    teardown();
    setDiag((d) => ({ ...d, phase: "ready" }));
  }, [teardown]);

  const reset = useCallback(() => {
    teardown();
    modelRef.current?.terminate();
    modelRef.current = null;
    confirmedRef.current = [];
    revealedRef.current = new Set();
    setRevealed(new Set());
    setHeard("");
    setDiag(EMPTY_DIAG);
    setState({
      status: words.map(() => "pending" as const),
      cursor: 0,
      waiting: false,
      firstBad: null,
    });
  }, [teardown, words]);

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

  const model = VOSK_MODELS.find((m) => m.key === modelKey)!;
  const busy = diag.phase === "loading-model";
  const listening = diag.phase === "listening";
  const score = scoreOf(state);
  const complete = state.cursor >= words.length;

  return (
    <div>
      <RecitedVerse
        words={words}
        status={state.status}
        cursor={state.cursor}
        waiting={state.waiting}
        onReveal={reveal}
      />

      <div style={{ margin: "16px 0 10px", fontSize: 13, color: "var(--ink-1)", minHeight: 20 }}>
        {complete ? (
          <strong style={{ color: "var(--pass)" }}>Recitation complete.</strong>
        ) : busy ? (
          <>Loading the acoustic model — {model.label}. First load is slow.</>
        ) : state.waiting ? (
          <>
            Waiting on{" "}
            <span className="hh-arabic" style={{ fontSize: 20, direction: "rtl" }}>
              {words[state.cursor]?.plain}
            </span>{" "}
            — say it again, or tap it to reveal.
          </>
        ) : listening ? (
          <>
            Listening… {state.cursor}/{words.length} words
          </>
        ) : (
          "Pick a model and press Start."
        )}
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
        <button
          className="hh-btn primary"
          onClick={listening ? stop : start}
          disabled={busy}
        >
          {busy ? "Loading model…" : listening ? "Stop" : "Start reciting"}
        </button>
        <button className="hh-btn ghost" onClick={reset} disabled={busy}>
          Reset
        </button>
        <button
          className="hh-btn ghost"
          onClick={() => setUseGrammar((v) => !v)}
          disabled={busy || listening}
        >
          Grammar: {useGrammar ? "on" : "off"}
        </button>
        <button className="hh-btn ghost" onClick={() => setWaitMode((v) => !v)}>
          {waitMode ? "Wait on mistakes: on" : "Wait on mistakes: off"}
        </button>
      </div>

      <div style={{ marginBottom: 18 }}>
        <label
          htmlFor="vosk-model"
          style={{ fontSize: 11.5, color: "var(--ink-2)", display: "block", marginBottom: 5 }}
        >
          Acoustic model
        </label>
        <select
          id="vosk-model"
          className="hh-input"
          value={modelKey}
          onChange={(e) => setModelKey(e.target.value)}
          disabled={busy || listening}
          style={{ appearance: "auto" }}
        >
          {VOSK_MODELS.map((m) => (
            <option key={m.key} value={m.key}>
              {m.label}
            </option>
          ))}
        </select>
        <p style={{ fontSize: 11.5, color: "var(--ink-2)", margin: "6px 0 0", lineHeight: 1.5 }}>
          {model.note} Fetch it first with{" "}
          <code>./scripts/fetch-vosk-model.sh {model.key}</code>.
        </p>
      </div>

      <p style={{ fontSize: 11.5, color: "var(--ink-2)", lineHeight: 1.6, margin: "0 0 20px" }}>
        <strong>Grammar on</strong> restricts the recognizer to this passage&apos;s words, which
        is the whole advantage of this engine. Turn it <strong>off</strong> to see open
        transcription for comparison.
      </p>

      <div style={{ borderTop: "1px solid var(--rule-1)", paddingTop: 16 }}>
        <Eyebrow>Diagnostics</Eyebrow>
        <dl
          style={{
            display: "grid",
            gridTemplateColumns: "auto 1fr",
            gap: "6px 14px",
            fontSize: 12,
            margin: "10px 0 0",
          }}
        >
          <Row k="Phase" v={diag.phase} bad={diag.phase === "error"} />
          <Row k="Model load" v={diag.modelMs ? `${diag.modelMs} ms` : "—"} />
          <Row k="Grammar words" v={diag.grammarWords ? String(diag.grammarWords) : "—"} />
          <Row
            k="Grammar applied"
            v={diag.phase === "listening" ? (diag.grammarApplied ? "yes" : "no — open recognition") : "—"}
          />
          <Row k="Sample rate" v={diag.sampleRate ? `${diag.sampleRate} Hz` : "—"} />
          <Row k="Partial results" v={String(diag.partials)} />
          <Row k="Final results" v={String(diag.finals)} />
          <Row k="Cursor" v={`${state.cursor} / ${words.length}`} />
          <Row
            k="Score"
            v={`${score.correct} correct · ${score.wrong} wrong · ${score.revealed} revealed`}
          />
          <Row k="Last error" v={diag.lastError || "none"} bad={!!diag.lastError} />
        </dl>

        <div style={{ marginTop: 14 }}>
          <Eyebrow>Last partial</Eyebrow>
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
            {diag.lastPartial || "—"}
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
      </div>
    </div>
  );
}

function Row({ k, v, bad }: { k: string; v: string; bad?: boolean }) {
  return (
    <>
      <dt style={{ color: "var(--ink-2)", whiteSpace: "nowrap" }}>{k}</dt>
      <dd style={{ margin: 0, color: bad ? "var(--fail)" : "var(--ink-0)", wordBreak: "break-word" }}>
        {v}
      </dd>
    </>
  );
}
