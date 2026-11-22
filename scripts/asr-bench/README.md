# ASR offline benchmark

Step 1 of the validation plan in `claude/recitation-live-correction.md`
(branch `docs/recitation-live-correction`): before any browser work, does each
candidate model transcribe murattal recitation well enough to follow, and what
does a live update cost?

```bash
python3 -m venv .venv-bench
.venv-bench/bin/pip install onnxruntime sherpa-onnx numpy soundfile
scripts/asr-bench/fetch.sh                      # ~430 MB models + 84 clips → .asr-bench/
.venv-bench/bin/python scripts/asr-bench/bench.py --data .asr-bench --threads 1 --out results.json
```

Needs `ffmpeg` on PATH. Clips are named `Reciter__SSSAAA.mp3`; drop your own
recording in with that pattern to score it against the ayah.

## Columns

- **WER**: word error rate after the normalization in `src/lib/recitation.ts`
  (marks stripped, dagger alef promoted, letters folded).
- **lenWER**: a word counts as matched at similarity ≥ 0.7, the live
  matcher's `SUBSTITUTION_THRESHOLD`. Closest to "would the cursor follow?".
- **CER / vCER**: character error rate without / with harakat.
- **RTF**: compute seconds per audio second. **noisy** adds white noise at 10 dB SNR.
- **window**: seconds to re-run the model over the last N seconds of audio,
  the cost of one live update. Neither model is cache-aware (B1's encoder takes
  only `audio_signal` and `length`), so live use means re-running a window.

## Results — 22 Nov 2026

84 clips: 28 ayahs (1:1–7, 112, 113:1–5, 67:1–5, 36:1–6, 2:255) × Alafasy,
Husary, Minshawy. Intel i7-9750H laptop, native onnxruntime.

| Model | Cond | WER | lenWER | CER | vCER | RTF 1 thr | RTF 4 thr |
|---|---|---|---|---|---|---|---|
| A wav2vec2 CTC, Quran, q4 (240 MB) | clean | 2.9% | **0.0%** | 0.7% | 2.8% | 0.57 | 0.23 |
| | noisy | 11.1% | 4.3% | 3.1% | 4.7% | 0.57 | 0.23 |
| B1 FastConformer RNNT, int8 (190 MB) | clean | 97.6% | 96.4% | 92.0% | 94.0% | 0.04 | 0.02 |
| | noisy | 98.1% | 96.6% | 92.0% | 93.9% | 0.04 | 0.02 |

Window re-run cost (seconds):

| Window | A, 1 thr | A, 4 thr | B1, 1 thr | B1, 4 thr |
|---|---|---|---|---|
| 2 s | 0.93 | 0.35 | 0.07 | 0.05 |
| 5 s | 2.46 | 0.90 | 0.16 | 0.10 |
| 10 s | 4.99 | 1.86 | 0.34 | 0.18 |
| 30 s | 18.06 | 6.25 | 1.35 | 0.60 |

### What this shows

- **A is accurate on these clips**: every ayah followable at the matcher's
  threshold, harakat included, and it degrades gracefully under noise.
- **B1 is not usable as exported**: 41 of 84 outputs are empty, and it
  hallucinates ("نهاية الدرس") on silence. It transcribes the basmala perfectly
  from the first 4 s of 1:1 and returns nothing for 5 s, so it is unstable
  rather than untrained. This is one int8 sherpa export; it says nothing about
  B2 (`mohammed/fastconformer-quran-ar`) or NVIDIA's fp32 model.
- **A's cost is the risk, not its accuracy.** Re-running the whole ayah does
  not scale: 10 s of audio takes 5 s on one laptop thread. Live use needs a
  short capped window (2–3 s) aligned against the known text, and even a 2 s
  window is 0.35–0.93 s here. A phone running WASM will be slower than native
  laptop; WebGPU is the likely mitigation. Only a device test can settle it.

### What this does not show

- **Students.** Every clip is a professional reciter, and B1's model card says
  NVIDIA trained on EveryAyah; A may have been too. Score a student recording
  before trusting the accuracy numbers.
- **Phone speed.** Native laptop onnxruntime, not onnxruntime-web on a phone.
- **Real noise.** White noise, not a classroom or a car.
- **Licence:** A is Apache-2.0 (model card); B1 is CC-BY-4.0.
