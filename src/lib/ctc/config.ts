// Recognition model and runtime, pinned so neither can change under us.
//
// Model: wav2vec2 fine-tuned on Quranic recitation, 4-bit ONNX, Apache-2.0.
// Benchmarked in scripts/asr-bench (2.9% WER, harakat included). Served by
// Hugging Face's CDN with CORS, pinned to a commit so the file is immutable.

export const MODEL_URL =
  "https://huggingface.co/mostafanewir70/quran-recitation-ctc-onnx/resolve/f90650aac5d9dcff15230a19998c0027f45b33f1/onnx/model_q4.onnx";

/** Used for progress when the server omits Content-Length. */
export const MODEL_BYTES = 241_230_289;

export const MODEL_MB = Math.round(MODEL_BYTES / 1_000_000);

/**
 * onnxruntime-web, loaded by the worker (public/ctc-worker.js) from the CDN.
 * The WebGPU build falls back to WASM on devices without a GPU adapter.
 */
export const ORT_WASM_PATH = "https://cdn.jsdelivr.net/npm/onnxruntime-web@1.31.1/dist/";
export const ORT_URL = `${ORT_WASM_PATH}ort.webgpu.bundle.min.mjs`;

export const SAMPLE_RATE = 16000;

/** wav2vec2 emits one frame per 20 ms. */
export const SAMPLES_PER_FRAME = 320;
