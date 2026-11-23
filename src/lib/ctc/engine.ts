// Live recognition engine: microphone → 16 kHz buffer → sliding window → words.
//
// The model is full-context, not streaming, so live use means re-running it
// over recent audio. Re-running the whole recitation does not scale (10 s of
// audio costs ~5 s on one laptop thread; see scripts/asr-bench), so the window
// starts where the last consumed word ended. It holds only the word being
// recited plus a little context, and stays short however long the test runs.
//
// A word is "settled" once enough audio has followed it for the model to be
// sure where it ended; only settled words are handed to the caller. Anything
// nearer the end of the window may be half-spoken and is never judged.

import { GRAPH_URL, MODEL_URL, MODEL_BYTES, ORT_URL, WEIGHTS_NAME, ORT_WASM_PATH, SAMPLE_RATE, SAMPLES_PER_FRAME } from "./config";

/** A word as the worker reports it (public/ctc-worker.js), frames relative to the window. */
interface HeardWord {
  text: string;
  startFrame: number;
  endFrame: number;
}

export type EngineStatus =
  | { phase: "idle" }
  | { phase: "downloading"; loaded: number; total: number }
  | { phase: "preparing" }
  | { phase: "ready"; backend: string }
  | { phase: "error"; message: string };

/** A settled word, with absolute sample positions. */
export interface SettledWord {
  text: string;
  start: number;
  end: number;
}

/* ── Worker singleton: survives unmount, so a download keeps going while the
      student goes back to listening. ── */

type Listener = (s: EngineStatus) => void;

let worker: Worker | null = null;
let status: EngineStatus = { phase: "idle" };
let cachedProbe: Promise<boolean> | null = null;
const listeners = new Set<Listener>();
const pending = new Map<number, (r: { words: HeardWord[]; ms: number } | Error) => void>();
let nextId = 1;

function setStatus(s: EngineStatus) {
  status = s;
  listeners.forEach((l) => l(s));
}

function getWorker(): Worker {
  if (worker) return worker;
  worker = new Worker("/ctc-worker.js", { type: "module" });
  worker.onmessage = (e) => {
    const m = e.data;
    if (m.type === "progress") setStatus({ phase: "downloading", loaded: m.loaded, total: m.total });
    else if (m.type === "ready") setStatus({ phase: "ready", backend: m.backend });
    else if (m.type === "result") pending.get(m.id)?.({ words: m.words, ms: m.ms });
    else if (m.type === "error") {
      if (m.id != null) pending.get(m.id)?.(new Error(m.message));
      else setStatus({ phase: "error", message: m.message });
    }
    if (m.id != null) pending.delete(m.id);
    if (m.type === "progress" && m.loaded >= m.total) setStatus({ phase: "preparing" });
  };
  return worker;
}

export function engineStatus(): EngineStatus {
  return status;
}

export function subscribe(l: Listener): () => void {
  listeners.add(l);
  return () => listeners.delete(l);
}

/** Whether the model is already in this browser's cache. */
export function isModelCached(): Promise<boolean> {
  cachedProbe ??= new Promise((resolve) => {
    const w = getWorker();
    const onMsg = (e: MessageEvent) => {
      if (e.data.type !== "cached") return;
      w.removeEventListener("message", onMsg);
      resolve(e.data.cached);
    };
    w.addEventListener("message", onMsg);
    w.postMessage({ type: "probe", modelUrl: MODEL_URL });
  });
  return cachedProbe;
}

/** Download (or read from cache) and prepare the model. Safe to call repeatedly. */
export function loadModel() {
  if (status.phase === "ready" || status.phase === "downloading" || status.phase === "preparing") return;
  setStatus({ phase: "preparing" });
  getWorker().postMessage({
    type: "load",
    modelUrl: MODEL_URL,
    modelBytes: MODEL_BYTES,
    graphUrl: GRAPH_URL,
    weightsName: WEIGHTS_NAME,
    ortUrl: ORT_URL,
    wasmPath: ORT_WASM_PATH,
  });
}

/** Window lengths are padded up to whole seconds so WebGPU compiles a handful of shapes, not hundreds. */
function padded(x: Float32Array): Float32Array {
  let mean = 0;
  for (let i = 0; i < x.length; i++) mean += x[i];
  mean /= x.length || 1;
  let v = 0;
  for (let i = 0; i < x.length; i++) v += (x[i] - mean) ** 2;
  const std = Math.sqrt(v / (x.length || 1) + 1e-7);
  const out = new Float32Array(Math.ceil(x.length / SAMPLE_RATE) * SAMPLE_RATE);
  for (let i = 0; i < x.length; i++) out[i] = (x[i] - mean) / std;
  return out;
}

function run(audio: Float32Array): Promise<{ words: HeardWord[]; ms: number }> {
  const id = nextId++;
  const input = padded(audio);
  return new Promise((resolve, reject) => {
    pending.set(id, (r) => (r instanceof Error ? reject(r) : resolve(r)));
    getWorker().postMessage({ type: "run", id, audio: input, length: audio.length }, [input.buffer]);
  });
}

/* ── Audio capture ── */

// Box-filter decimation to 16 kHz inside the audio thread. Crude, but speech
// energy sits well below 8 kHz and the model was trained on telephone-grade
// and studio audio alike.
const WORKLET = `
class Downsample extends AudioWorkletProcessor {
  constructor(opts) {
    super();
    this.ratio = sampleRate / ${SAMPLE_RATE};
    this.acc = 0; this.n = 0; this.pos = 0;
    this.out = new Float32Array(1600); this.len = 0;
  }
  process(inputs) {
    // No input (a source ended, or none connected yet) still counts as time
    // passing: emit silence so a trailing word can settle.
    const ch = (inputs[0] && inputs[0][0]) || this.silence || (this.silence = new Float32Array(128));
    for (let i = 0; i < ch.length; i++) {
      this.acc += ch[i]; this.n++; this.pos++;
      if (this.pos >= this.ratio) {
        this.out[this.len++] = this.acc / this.n;
        this.acc = 0; this.n = 0; this.pos -= this.ratio;
        if (this.len === this.out.length) {
          this.port.postMessage(this.out.slice(0)); this.len = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor("hh-downsample", Downsample);
`;

/** Min new audio before re-running, and the longest window ever sent. */
const HOP = 0.3 * SAMPLE_RATE;
const MAX_WINDOW = 4 * SAMPLE_RATE;
/**
 * A single word still sounding at the end of a full window (a 6-count madd
 * like ٱلضَّآلِّينَ runs 3-4 s) gets the window stretched to this before
 * anything is forced. Forcing earlier clips the word and the model hears a
 * different one.
 */
const STRETCH_WINDOW = 10 * SAMPLE_RATE;
/** A worker that never answers (crashed, out of memory) must not hang the loop forever. */
const RUN_TIMEOUT_MS = 30_000;
/**
 * Audio that must follow a word before it is judged, once the next word has
 * begun. Without right context the model ends words early: «ٱلرَّحِيمِ»
 * arrives as «الرحي» then «م». Costs this much latency per word.
 */
const SETTLE = 0.5 * SAMPLE_RATE;
/**
 * Quiet after a word that ends it when no next word has begun (end of an ayah,
 * a pause to remember). "No new letters" is not enough: CTC emits a held
 * vowel's letter once and then blanks, so mid-madd «ٱلضَّآلِّينَ» looks like a
 * finished «الضا» until the reciter actually stops.
 */
const SETTLE_QUIET = 0.3 * SAMPLE_RATE;
/**
 * Already-judged audio re-run in front of each window. Without it every window
 * starts exactly at the word due next, and the model garbles words it hears
 * with no lead-in, worst on long madd endings.
 */
const LEFT_CONTEXT = 1 * SAMPLE_RATE;
/** With nothing heard, keep only this much trailing audio. */
const SILENCE_KEEP = 1 * SAMPLE_RATE;
/**
 * Loudest 20 ms frame below this is silence. The model invents short words
 * («طل») on silence, and each one would count as a wrong attempt while the
 * student is pausing to remember. Speech peaks around 0.05-0.3 after the
 * browser's auto gain; a quiet room sits well under 0.01.
 */
const SPEECH_RMS = 0.015;

/** RMS of the loudest 20 ms frame in buf[from, to). */
function peakRms(buf: Float32Array, from: number, to: number): number {
  let peak = 0;
  for (let f = Math.max(0, from); f + SAMPLES_PER_FRAME <= to; f += SAMPLES_PER_FRAME) {
    let e = 0;
    for (let i = f; i < f + SAMPLES_PER_FRAME; i++) e += buf[i] * buf[i];
    peak = Math.max(peak, Math.sqrt(e / SAMPLES_PER_FRAME));
  }
  return peak;
}

export interface EngineStats {
  runMs: number;
  windowSec: number;
  /** Seconds of recorded audio waiting behind this window. Growing means the device can't keep up. */
  behindSec: number;
  /** Loudest 20 ms frame in the window; below SPEECH_RMS counts as silence. */
  level: number;
  speechThreshold: number;
}

export interface ListenerSession {
  stop(): void;
  /** Debug: the loop's internal positions, in seconds. */
  peek(): Record<string, number | string>;
  /** Audio source: the microphone, or a URL list for simulated recitation. */
  readonly source: "mic" | "file";
}

export interface ListenOptions {
  /** Called with each word once it has settled, in order. */
  onWord: (w: SettledWord) => void;
  /** Called with the unsettled tail, for a live "hearing…" hint. */
  onPartial?: (text: string) => void;
  onError?: (message: string) => void;
  /** After every model run: compute time, window length, and audio not yet processed. */
  onStats?: (s: EngineStats) => void;
  /** Debug: recite these audio files instead of using the microphone. */
  simulate?: string[];
}

/**
 * Start listening. Must be called from a user gesture (AudioContext, mic).
 * Words are delivered in order; each is delivered once.
 */
export async function listen(opts: ListenOptions): Promise<ListenerSession> {
  const ctx = new AudioContext();
  await ctx.resume();

  let buf = new Float32Array(SAMPLE_RATE * 60);
  let len = 0;
  const append = (chunk: Float32Array) => {
    if (len + chunk.length > buf.length) {
      const next = new Float32Array(buf.length * 2);
      next.set(buf.subarray(0, len));
      buf = next;
    }
    buf.set(chunk, len);
    len += chunk.length;
  };

  const url = URL.createObjectURL(new Blob([WORKLET], { type: "application/javascript" }));
  await ctx.audioWorklet.addModule(url);
  URL.revokeObjectURL(url);
  const node = new AudioWorkletNode(ctx, "hh-downsample");
  node.port.onmessage = (e) => append(e.data);

  let stream: MediaStream | null = null;
  const sources: AudioNode[] = [];
  if (opts.simulate) {
    // Play the files back-to-back into the recognizer, at real speed.
    let t = ctx.currentTime + 0.2;
    for (const u of opts.simulate) {
      const data = await (await fetch(u)).arrayBuffer();
      const audio = await ctx.decodeAudioData(data);
      const src = ctx.createBufferSource();
      src.buffer = audio;
      src.connect(node);
      src.start(t);
      t += audio.duration + 0.3;
      sources.push(src);
    }
  } else {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    });
    const src = ctx.createMediaStreamSource(stream);
    src.connect(node);
    sources.push(src);
  }
  // The worklet only runs when connected to the graph; route it to a muted gain.
  const mute = ctx.createGain();
  mute.gain.value = 0;
  node.connect(mute).connect(ctx.destination);

  let stopped = false;
  let state = "starting";
  let windowStart = 0;
  let lastRunStart = -1;
  let lastRunEnd = 0;
  let limit = MAX_WINDOW;

  const withTimeout = <T,>(p: Promise<T>) =>
    Promise.race([
      p,
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("Speech model stopped responding")), RUN_TIMEOUT_MS)),
    ]);

  async function loop() {
    while (!stopped) {
      // Work through recorded audio in order. When the device is slow this
      // falls behind live audio rather than skipping any of it. `judgedTo` is
      // where undelivered audio begins; the window reaches back before it for
      // context, but only words beyond it are delivered.
      const judgedTo = windowStart;
      const end = Math.min(len, judgedTo + limit);
      // Run on a new start, a hop of new audio, or the window reaching its cap:
      // without the last, a cap less than a hop past the previous run waits
      // forever while recorded audio queues up behind it.
      const capped = end === judgedTo + limit && end > lastRunEnd;
      const fresh = judgedTo !== lastRunStart || end - lastRunEnd >= HOP || capped;
      if (end - judgedTo < HOP || !fresh) {
        state = "waiting for audio";
        await new Promise((r) => setTimeout(r, 60));
        continue;
      }
      lastRunStart = judgedTo;
      lastRunEnd = end;
      const stat = (runMs: number, level: number) =>
        opts.onStats?.({
          runMs,
          windowSec: (end - judgedTo) / SAMPLE_RATE,
          behindSec: (len - end) / SAMPLE_RATE,
          level,
          speechThreshold: SPEECH_RMS,
        });
      const level = peakRms(buf, judgedTo, end);
      if (level < SPEECH_RMS) {
        stat(0, level);
        windowStart = Math.max(windowStart, end - SILENCE_KEEP);
        opts.onPartial?.("");
        continue;
      }
      const start = Math.max(0, judgedTo - LEFT_CONTEXT);
      let words: HeardWord[];
      let ms: number;
      state = "running";
      try {
        ({ words, ms } = await withTimeout(run(buf.slice(start, end))));
      } catch (e) {
        opts.onError?.(e instanceof Error ? e.message : String(e));
        await new Promise((r) => setTimeout(r, 500));
        continue;
      }
      if (stopped) break;
      stat(ms, level);

      const abs = (f: number) => start + f * SAMPLES_PER_FRAME;
      words = words.filter(
        (w) =>
          // Already delivered: the context in front of the window.
          (abs(w.startFrame) + abs(w.endFrame + 1)) / 2 >= judgedTo &&
          // Invented over silence inside an otherwise voiced window.
          peakRms(buf, abs(w.startFrame), abs(w.endFrame + 1)) >= SPEECH_RMS,
      );

      if (!words.length) {
        windowStart = Math.max(windowStart, end - SILENCE_KEEP);
        opts.onPartial?.("");
        continue;
      }

      const isSettled = (i: number) => {
        const wEnd = abs(words[i].endFrame + 1);
        if (i < words.length - 1) return end - wEnd >= SETTLE;
        return end - wEnd >= SETTLE_QUIET && peakRms(buf, wEnd, end) < SPEECH_RMS;
      };
      // A full window holding one word that is still sounding: stretch the
      // window first, and only force the word through once even that is full.
      const full = end - judgedTo >= limit;
      const lone = words.length === 1 && !isSettled(0);
      if (full && lone && limit < STRETCH_WINDOW) {
        limit = STRETCH_WINDOW;
        continue;
      }
      let consumedTo = -1;
      for (let i = 0; i < words.length; i++) {
        const w = words[i];
        const wEnd = abs(w.endFrame + 1);
        if (!isSettled(i) && !(full && lone)) break;
        opts.onWord({ text: w.text, start: abs(w.startFrame), end: wEnd });
        // Cut halfway into the gap before the next word, so neither word's
        // edges leak into the other's window.
        const next = words[i + 1];
        consumedTo = next ? Math.floor((wEnd + abs(next.startFrame)) / 2) : wEnd;
      }
      if (consumedTo > windowStart) {
        windowStart = consumedTo;
        limit = MAX_WINDOW;
      }
      const tail = words.filter((w) => abs(w.endFrame + 1) > windowStart).map((w) => w.text);
      opts.onPartial?.(tail.join(" "));
    }
  }
  loop();

  return {
    source: opts.simulate ? "file" : "mic",
    peek: () => ({
      state,
      ctx: ctx.state,
      recordedSec: len / SAMPLE_RATE,
      judgedToSec: windowStart / SAMPLE_RATE,
      lastRunEndSec: lastRunEnd / SAMPLE_RATE,
      limitSec: limit / SAMPLE_RATE,
    }),
    stop() {
      stopped = true;
      sources.forEach((s) => {
        try { (s as AudioBufferSourceNode).stop?.(); } catch {}
        s.disconnect();
      });
      stream?.getTracks().forEach((t) => t.stop());
      node.disconnect();
      ctx.close();
    },
  };
}
