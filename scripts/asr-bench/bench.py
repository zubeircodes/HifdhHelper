"""Offline benchmark: Option A (wav2vec2 CTC) vs Option B1 (FastConformer).

Answers two questions from claude/recitation-live-correction.md before any
browser work: does each model transcribe murattal recitation well enough to
follow, and how much compute does one re-run of the rolling window cost?

Both models are full-context (B1's encoder has no cache inputs), so live use
means re-running over the audio heard so far. The window-latency table is
therefore the number that decides whether the cursor keeps up.

Usage:
    python bench.py --data DIR [--threads 1] [--out results.json]

DIR is what fetch.sh populated: models/a, models/b1, clips/*.mp3.
"""

import argparse
import json
import re
import statistics
import subprocess
import sys
import time
import unicodedata
from pathlib import Path

import numpy as np
import onnxruntime as ort
import sherpa_onnx

SR = 16000

# ---------------------------------------------------------------------------
# Normalization — a port of src/lib/recitation.ts so scores mean what the
# app's matcher would see.
# ---------------------------------------------------------------------------

DIACRITICS = re.compile(
    "[ؐ-ًؚ-ٰٟۖ-ۭ࣓-ࣿـ​-‍]"
)
LETTER_FOLD = str.maketrans({
    "آ": "ا", "أ": "ا", "إ": "ا", "ٱ": "ا",
    "ى": "ي", "ة": "ه", "ؤ": "و", "ئ": "ي",
})
HTML_TAG = re.compile(r"<[^>]*>")
ARABIC_INDIC_ONLY = re.compile(r"^[٠-٩]+$")
SUBSTITUTION_THRESHOLD = 0.7  # matches recitation.ts

# Harakat kept for the vocalized comparison; Quranic sukun U+06E1 is folded to
# the standard sukun so Uthmani and MSA output compare on the same mark.
HARAKAT = set("ًٌٍَُِّْ")


def normalize_word(w: str) -> str:
    """normalizeWordMsa: dagger alef promoted, marks stripped, letters folded."""
    w = unicodedata.normalize("NFC", w).replace("ٰ", "ا")
    return DIACRITICS.sub("", w).translate(LETTER_FOLD).strip()


def vocalized_word(w: str) -> str:
    w = unicodedata.normalize("NFC", w).replace("ٰ", "ا").replace("ۡ", "ْ")
    w = w.translate(LETTER_FOLD)
    return "".join(c for c in w if c in HARAKAT or not DIACRITICS.match(c))


def words_of(text: str) -> list[str]:
    out = []
    for raw in HTML_TAG.sub("", text).split():
        if ARABIC_INDIC_ONLY.match(raw) or not normalize_word(raw):
            continue
        out.append(raw)
    return out


def similarity(a: str, b: str) -> float:
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    return 1 - edit_distance(a, b) / max(len(a), len(b))


def edit_distance(a, b, sub_cost=None) -> float:
    prev = list(range(len(b) + 1))
    for i in range(1, len(a) + 1):
        row = [i] + [0] * len(b)
        for j in range(1, len(b) + 1):
            c = sub_cost(a[i - 1], b[j - 1]) if sub_cost else (a[i - 1] != b[j - 1])
            row[j] = min(prev[j] + 1, row[j - 1] + 1, prev[j - 1] + c)
        prev = row
    return prev[-1]


def score(ref_words: list[str], hyp_text: str) -> dict:
    ref = [normalize_word(w) for w in ref_words]
    hyp = [n for n in (normalize_word(w) for w in hyp_text.split()) if n]
    lenient = lambda r, h: 0 if similarity(r, h) >= SUBSTITUTION_THRESHOLD else 1
    ref_v = "".join(vocalized_word(w) for w in ref_words)
    hyp_v = "".join(vocalized_word(w) for w in hyp_text.split())
    return {
        "ref_words": len(ref),
        "word_errors": edit_distance(ref, hyp),
        "lenient_word_errors": edit_distance(ref, hyp, lenient),
        "ref_chars": len("".join(ref)),
        "char_errors": edit_distance("".join(ref), "".join(hyp)),
        "ref_vchars": len(ref_v),
        "vchar_errors": edit_distance(ref_v, hyp_v),
    }


# ---------------------------------------------------------------------------
# Audio
# ---------------------------------------------------------------------------

def load_audio(path: Path) -> np.ndarray:
    raw = subprocess.run(
        ["ffmpeg", "-v", "error", "-i", str(path), "-ac", "1", "-ar", str(SR), "-f", "f32le", "-"],
        check=True, capture_output=True,
    ).stdout
    return np.frombuffer(raw, dtype=np.float32).copy()


def add_noise(x: np.ndarray, snr_db: float, seed: int) -> np.ndarray:
    rng = np.random.default_rng(seed)
    p_sig = float(np.mean(x ** 2)) or 1e-12
    noise = rng.standard_normal(len(x)).astype(np.float32)
    return x + noise * np.sqrt(p_sig / 10 ** (snr_db / 10))


# ---------------------------------------------------------------------------
# Models
# ---------------------------------------------------------------------------

class ModelA:
    name = "A  wav2vec2 CTC (Quran, q4)"

    def __init__(self, d: Path, threads: int):
        opts = ort.SessionOptions()
        opts.intra_op_num_threads = threads
        opts.inter_op_num_threads = 1
        self.sess = ort.InferenceSession(str(d / "onnx/model_q4.onnx"), opts, providers=["CPUExecutionProvider"])
        vocab = json.loads((d / "vocab.json").read_text())
        self.id2tok = {v: k for k, v in vocab.items()}

    def transcribe(self, x: np.ndarray) -> str:
        x = (x - x.mean()) / np.sqrt(x.var() + 1e-7)
        logits = self.sess.run(None, {"input_values": x[None, :].astype(np.float32)})[0][0]
        out, last = [], -1
        for i in logits.argmax(-1):
            if i != last and i != 0:
                out.append(self.id2tok[int(i)])
            last = i
        text = "".join(t for t in out if not (t.startswith("<") and t.endswith(">")))
        return " ".join(text.replace("|", " ").split())


class ModelB1:
    name = "B1 FastConformer RNNT (Arabic, int8)"

    def __init__(self, d: Path, threads: int):
        self.rec = sherpa_onnx.OfflineRecognizer.from_transducer(
            encoder=str(d / "encoder.int8.onnx"), decoder=str(d / "decoder.int8.onnx"),
            joiner=str(d / "joiner.int8.onnx"), tokens=str(d / "tokens.txt"),
            num_threads=threads, sample_rate=SR, feature_dim=80,
            decoding_method="greedy_search", model_type="nemo_transducer",
        )

    def transcribe(self, x: np.ndarray) -> str:
        s = self.rec.create_stream()
        s.accept_waveform(SR, x)
        self.rec.decode_stream(s)
        return s.result.text.strip()


# ---------------------------------------------------------------------------

def aggregate(rows):
    t = lambda k: sum(r[k] for r in rows)
    return {
        "WER": t("word_errors") / t("ref_words"),
        "lenient_WER": t("lenient_word_errors") / t("ref_words"),
        "CER": t("char_errors") / t("ref_chars"),
        "vowelled_CER": t("vchar_errors") / t("ref_vchars"),
        "RTF": t("compute_s") / t("audio_s"),
    }


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--data", type=Path, required=True)
    ap.add_argument("--corpus", type=Path, default=Path(__file__).resolve().parents[2] / "public/text/qpc-hafs-tajweed.json")
    ap.add_argument("--threads", type=int, default=1)
    ap.add_argument("--snr", type=float, default=10.0)
    ap.add_argument("--out", type=Path)
    args = ap.parse_args()

    corpus = json.loads(args.corpus.read_text())
    clips = sorted((args.data / "clips").glob("*.mp3"))
    if not clips:
        sys.exit(f"no clips in {args.data / 'clips'} — run fetch.sh first")

    audio = {}
    for c in clips:
        audio[c] = load_audio(c)

    report = {"threads": args.threads, "snr_db": args.snr, "models": {}}
    for cls, sub in ((ModelA, "models/a"), (ModelB1, "models/b1")):
        t0 = time.perf_counter()
        model = cls(args.data / sub, args.threads)
        load_s = time.perf_counter() - t0
        model.transcribe(np.zeros(SR, dtype=np.float32))  # warm-up

        results = {"clean": [], "noisy": []}
        for i, c in enumerate(clips):
            reciter, sura_ayah = c.stem.rsplit("__", 1)
            key = f"{int(sura_ayah[:3])}:{int(sura_ayah[3:])}"
            ref = words_of(corpus[key]["text"])
            for cond in results:
                x = audio[c] if cond == "clean" else add_noise(audio[c], args.snr, seed=i)
                t0 = time.perf_counter()
                hyp = model.transcribe(x)
                dt = time.perf_counter() - t0
                row = {"clip": c.stem, "reciter": reciter, "key": key, "hyp": hyp,
                       "audio_s": len(x) / SR, "compute_s": dt, **score(ref, hyp)}
                results[cond].append(row)
            print(f"  {cls.__name__} {i + 1}/{len(clips)} {c.stem}", file=sys.stderr)

        # Cost of one rolling-window re-run, by window length. Uses the longest clip.
        longest = max(audio.values(), key=len)
        windows = {}
        for sec in (2, 5, 10, 20, 30):
            if sec * SR > len(longest):
                break
            times = []
            for _ in range(3):
                t0 = time.perf_counter()
                model.transcribe(longest[: sec * SR])
                times.append(time.perf_counter() - t0)
            windows[sec] = statistics.median(times)

        reciters = sorted({r["reciter"] for r in results["clean"]})
        report["models"][cls.name] = {
            "load_s": load_s,
            "clean": aggregate(results["clean"]),
            "noisy": aggregate(results["noisy"]),
            "clean_by_reciter": {rc: aggregate([r for r in results["clean"] if r["reciter"] == rc]) for rc in reciters},
            "window_s": windows,
            "rows": results,
        }

    print_report(report)
    if args.out:
        args.out.write_text(json.dumps(report, ensure_ascii=False, indent=1))


def print_report(rep):
    pct = lambda v: f"{v * 100:5.1f}%"
    print(f"\nthreads={rep['threads']}  noise SNR={rep['snr_db']} dB\n")
    print(f"{'model':40} {'cond':6} {'WER':>7} {'lenWER':>7} {'CER':>7} {'vCER':>7} {'RTF':>6}")
    for name, m in rep["models"].items():
        for cond in ("clean", "noisy"):
            a = m[cond]
            print(f"{name:40} {cond:6} {pct(a['WER'])} {pct(a['lenient_WER'])} {pct(a['CER'])} {pct(a['vowelled_CER'])} {a['RTF']:6.3f}")
    print("\nclean WER by reciter")
    for name, m in rep["models"].items():
        print(f"  {name}: " + ", ".join(f"{rc.split('_')[0]} {pct(a['WER']).strip()}" for rc, a in m["clean_by_reciter"].items()))
    print("\nload time, and seconds to re-run the model over a window of N seconds")
    for name, m in rep["models"].items():
        w = "  ".join(f"{k}s→{v:.2f}" for k, v in m["window_s"].items())
        print(f"  {name}: load {m['load_s']:.1f}s | {w}")


if __name__ == "__main__":
    main()
