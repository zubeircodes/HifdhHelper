// CTC recognition worker: downloads, caches and runs the Quran wav2vec2 model.
//
// Plain JS in public/ on purpose: Next 16.2's Turbopack emits a TypeScript
// worker as a raw asset instead of compiling it. onnxruntime-web is imported
// from the CDN at the exact version pinned in src/lib/ctc/config.ts, which
// sends the URLs with the "load" message so they live in one place.
//
// Runs off the main thread so a slow phone CPU never stalls the UI. The model
// is fetched once into the Cache API and reused on every later visit.
//
// Protocol (see src/lib/ctc/engine.ts):
//   in:  { type: "probe", modelUrl } | { type: "load", modelUrl, modelBytes, ortUrl, wasmPath }
//      | { type: "run", id, audio, length }
//   out: { type: "cached", cached } | { type: "progress", loaded, total }
//      | { type: "ready", backend, loadMs } | { type: "result", id, words, ms }
//      | { type: "error", message, id? }

const CACHE_NAME = "hh-ctc-model-v1";
const SAMPLES_PER_FRAME = 320; // wav2vec2: one frame per 20 ms at 16 kHz

/** Output index → character, from the model's vocab.json. 0 is the CTC blank. */
const VOCAB = {
  4: "|", 6: "ء", 7: "آ", 8: "أ", 9: "ؤ", 10: "إ", 11: "ئ", 12: "ا", 13: "ب",
  14: "ة", 15: "ت", 16: "ث", 17: "ج", 18: "ح", 19: "خ", 20: "د", 21: "ذ",
  22: "ر", 23: "ز", 24: "س", 25: "ش", 26: "ص", 27: "ض", 28: "ط", 29: "ظ",
  30: "ع", 31: "غ", 32: "ـ", 33: "ف", 34: "ق", 35: "ك", 36: "ل", 37: "م",
  38: "ن", 39: "ه", 40: "و", 41: "ى", 42: "ي", 43: "ً", 44: "ٌ",
  45: "ٍ", 46: "َ", 47: "ُ", 48: "ِ", 49: "ّ",
  50: "ْ", 51: "ٱ", 52: "ٰ", 53: "ٓ", 54: "ۥ", 55: "ۦ",
};
const WORD_DELIMITER = 4;

let ort = null;
let session = null;
let loading = null;

const post = (msg) => self.postMessage(msg);

async function cachedModel(url) {
  try {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(url);
  } catch {
    return undefined;
  }
}

async function download(url, expectedBytes) {
  const hit = await cachedModel(url);
  if (hit) return new Uint8Array(await hit.arrayBuffer());

  const res = await fetch(url);
  if (!res.ok || !res.body) throw new Error(`Model download failed (HTTP ${res.status})`);
  const total = Number(res.headers.get("content-length")) || expectedBytes;
  const buf = new Uint8Array(total);
  const reader = res.body.getReader();
  let loaded = 0;
  let lastPost = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    if (loaded + value.length > buf.length) throw new Error("Model larger than expected");
    buf.set(value, loaded);
    loaded += value.length;
    if (loaded - lastPost > 1_000_000 || loaded === total) {
      post({ type: "progress", loaded, total });
      lastPost = loaded;
    }
  }
  if (loaded !== total) throw new Error(`Model download incomplete (${loaded} of ${total} bytes)`);

  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.put(url, new Response(buf, { headers: { "content-type": "application/octet-stream" } }));
  } catch {
    // Storage full or blocked (private mode): works for this visit, downloads again next time.
  }
  return buf;
}

async function createSession(bytes) {
  if (self.navigator && "gpu" in self.navigator) {
    try {
      session = await ort.InferenceSession.create(bytes, { executionProviders: ["webgpu"] });
      return "webgpu";
    } catch {
      // No adapter, or an op unsupported: fall through to CPU.
    }
  }
  session = await ort.InferenceSession.create(bytes, { executionProviders: ["wasm"] });
  return "wasm";
}

function load(msg) {
  loading ??= (async () => {
    const t0 = performance.now();
    ort ??= await import(msg.ortUrl);
    ort.env.wasm.wasmPaths = msg.wasmPath;
    const bytes = await download(msg.modelUrl, msg.modelBytes);
    const backend = await createSession(bytes);
    // The first run compiles kernels; do it now rather than on the first word.
    await infer(new Float32Array(16000), 16000);
    post({ type: "ready", backend, loadMs: Math.round(performance.now() - t0) });
  })().catch((e) => {
    loading = null;
    post({ type: "error", message: e instanceof Error ? e.message : String(e) });
  });
  return loading;
}

/**
 * Greedy CTC decode with word timings.
 *
 * `audio` may be zero-padded past `length` (fixed lengths keep WebGPU from
 * recompiling for every window size); frames past the real audio are ignored.
 */
async function infer(audio, length) {
  if (!session) throw new Error("Model not loaded");
  const input = new ort.Tensor("float32", audio, [1, audio.length]);
  const out = await session.run({ input_values: input });
  const logits = out.logits;
  const [, frames, vocab] = logits.dims;
  const data = logits.data;
  const realFrames = Math.min(frames, Math.ceil(length / SAMPLES_PER_FRAME));

  const words = [];
  let cur = null;
  let last = -1;
  for (let f = 0; f < realFrames; f++) {
    let best = 0;
    let bestV = -Infinity;
    const row = f * vocab;
    for (let k = 0; k < vocab; k++) {
      const v = data[row + k];
      if (v > bestV) { bestV = v; best = k; }
    }
    if (best !== last) {
      if (best === WORD_DELIMITER) {
        if (cur) words.push(cur);
        cur = null;
      } else if (VOCAB[best]) {
        if (!cur) cur = { text: "", startFrame: f, endFrame: f };
        cur.text += VOCAB[best];
        cur.endFrame = f;
      }
    } else if (cur && VOCAB[best]) {
      cur.endFrame = f;
    }
    last = best;
  }
  if (cur) words.push(cur);
  logits.dispose?.();
  input.dispose?.();
  return words;
}

self.onmessage = async (e) => {
  const msg = e.data;
  try {
    if (msg.type === "probe") {
      post({ type: "cached", cached: !!(await cachedModel(msg.modelUrl)) });
    } else if (msg.type === "load") {
      await load(msg);
    } else if (msg.type === "run") {
      const t0 = performance.now();
      const words = await infer(msg.audio, msg.length);
      post({ type: "result", id: msg.id, words, ms: Math.round(performance.now() - t0) });
    }
  } catch (err) {
    post({ type: "error", message: err instanceof Error ? err.message : String(err), id: msg.id });
  }
};
