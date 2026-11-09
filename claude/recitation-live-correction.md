# Live Recitation Correction — Implementation Options

> **Status (8 Nov 2026):** Research complete, nothing built, decision pending.
> Three viable paths, all verified against real model files and the live
> `qpc-hafs-tajweed.json` in this repo. All three run **entirely on the
> student's device**: no API, no GPU server, no per-request cost. The engine
> from the `live_reciter.html` prototype ports to all three unchanged, but it
> carries a fatal bug that must be fixed first (§7.1).
>
> **Recommendation:** validate Option A in 20 minutes (§9 step 1) before
> committing to anything.

---

## 1. What we're building

A student recites an assigned passage aloud. The app follows along live,
highlights each word correct or wrong as they speak, holds on a misread word
until they say it right, and saves the attempt for the instructor.

Hard requirements:

- **Live**, as they recite. Not record-then-process.
- **iPhone and Android**, in a browser, no app install.
- **Free to run** at our scale.

Non-requirements for v1:

- Tajwīd grading (that's a later tier, see Muaalem in §6)
- Replacing the instructor's grade. The recitation result is *evidence for*
  the teacher, never a substitute. See §10.

---

## 2. The key insight: alignment, not transcription

**We always know the expected text.** The student was assigned Al-Baqarah
2:30–35; we have those words. So this is not open-vocabulary speech
recognition, it is **constrained decoding against a known word sequence**.

That changes the difficulty class entirely:

| | Open transcription | Constrained to the ayah |
|---|---|---|
| Search space | tens of thousands of words | ~10 words |
| What a 16% WER model does | mis-transcribes, cursor drifts | reliably picks the right next word |

Every option below exploits this. It is why we do not need Tarteel's
proprietary 4%-WER model to get reliable word-by-word highlighting, and it is
why a merely decent acoustic model is enough.

Two ways to exploit it, depending on option:

- **CTC forced alignment** — the model emits per-frame character posteriors;
  we decode against only the expected sequence. Gives word timings for free.
- **Grammar/vocabulary constraint** — the decoder's graph is replaced with one
  built from the ayah's words only (Vosk/Kaldi supports this natively).

---

## 3. What's ruled out, and why

### 3.1 Web Speech API — cannot work on iPhone

This is what `live_reciter.html` uses. It works on desktop Chrome and Android
Chrome. It cannot work on iPhone, and this is not a bug we can route around.

- `continuous = true` on iOS **keeps the microphone open and never returns
  final text**. Documented WebKit behaviour, not a timing issue.
- `interimResults` on WebKit is undefined enough that Apple's own tracker
  still has an open question about what it does.
- **Every third-party iOS browser renders with WebKit** by App Store rule.
  Installing Chrome on an iPhone changes nothing: it is a skin over Safari's
  engine, and some sources report iOS Chrome doesn't expose
  `SpeechRecognition` at all. Apple permits alternative engines in the EU and
  Japan under entitlement, but **no vendor ships a non-WebKit build**.
- **There is no MediaStream input.** `SpeechRecognition` reads only the system
  default input device. You cannot feed it audio from a phone, a WebRTC call,
  or a file. ([W3C speech-api issue 66](https://github.com/w3c/speech-api/issues/66))

The last point explains why the laptop test worked: macOS made the iPhone the
*system microphone* (Continuity/Bluetooth) while Chrome did the recognition
locally. Nothing was streamed into the browser. That setup is a fine **teacher
tool on a laptop**, but it is not a student-phone product.

### 3.2 Whisper — batch, not streaming

Whisper is a 30-second-window encoder-decoder. Sliding that window is still
record-and-wait, with 1–2s of lag and wasted recompute. Rejected.

This also rules out the `record → Groq Whisper` path in
`~/workspace/voice-recitation-backend`. For the record, its numbers were: 20
requests/min free tier, 7,200 audio-seconds/hour, ~$0.04 per audio-hour paid.
Cost was never the blocker; the batch architecture is. See Appendix C for a
real bug in that repo if we ever revisit it.

### 3.3 What is *not* ruled out

Cache-aware streaming CTC/transducer models running client-side in ONNX. That
is what Tarteel actually does, and public Quran-tuned weights exist. §4 and §6.

---

## 4. The three options

> Numbering note: this supersedes the ordering used earlier in discussion.
> "Download an off-the-shelf Arabic streaming model" was initially judged
> impossible; that was wrong, and Option B is the correction.

### Option A — wav2vec2 CTC in the browser · **quickest to validate**

**Model:** [`mostafanewir70/quran-recitation-ctc-onnx`](https://huggingface.co/mostafanewir70/quran-recitation-ctc-onnx)

| | |
|---|---|
| Size | **240 MB** (4-bit MatMulNBits ONNX) |
| Base | `rabah2026/wav2vec2-large-xlsr-53-arabic-quran-v_final`, fine-tuned on Quranic recitation |
| Output | character-level CTC, **with harakat** |
| Runtime | **Transformers.js** — usage snippet on the model card |
| License | ⚠️ unconfirmed — check before shipping |

**Why it fits.** wav2vec2 is encoder-only CTC, so it is frame-synchronous by
nature: run it over the audio heard so far every few hundred milliseconds and
you get updated per-frame posteriors. The model card itself describes this use
case as "live, word-by-word checking of a recitation against the known ayah."

**Mechanism:** mic → AudioWorklet (16 kHz mono) → rolling buffer → ONNX
inference → per-frame logits → constrained decode against the expected ayah →
cursor position + per-word status → render.

**Work:** days. The model is already ONNX, already transformers.js-ready.
Most of the effort is the AudioWorklet, the rolling buffer, and the
constrained decoder.

**Risk:** rolling-window recompute is wasteful (no cache-awareness), so CPU
cost grows with how much audio you re-feed. Mitigate by capping the window to
the current ayah and resetting at each ayah boundary.

---

### Option B — cache-aware streaming FastConformer · **the Tarteel architecture, best ceiling**

This is literally what Tarteel runs: NVIDIA FastConformer fine-tuned via
NeMo/Riva, exported to a quantized ONNX path for browsers and React Native.
Their *model* is proprietary; the *architecture* and comparable weights are
public.

Cache-aware means the encoder processes **only new audio** while reusing cached
context. Compute per chunk is constant no matter how long the student recites,
with runtime-configurable chunk sizes from 80 ms to 1.12 s. That is the
difference between "live" and "nearly live."

**Two ways in:**

**B1 — use the published int8 export (smallest, fastest start)**

[`Synthesium/quran-recitation-v2-onnx`](https://huggingface.co/Synthesium/quran-recitation-v2-onnx)
→ the `fastconformer-ar-transducer/` subfolder only:

| File | Size |
|---|---|
| `encoder.int8.onnx` | 172.4 MB |
| `decoder.int8.onnx` | 15.8 MB |
| `joiner.int8.onnx` | 1.4 MB |
| **total** | **189.6 MB** |

Base is NVIDIA's Arabic FastConformer hybrid RNNT/CTC (~115M params),
packaged for sherpa-onnx, diacritized output, **CC-BY-4.0** (attribution).
Do not download the whole repo — it is 3.6 GB because it bundles several
unrelated models.

**B2 — export your own from the Quran-tuned NeMo checkpoint (best quality)**

[`mohammed/fastconformer-quran-ar`](https://huggingface.co/mohammed/fastconformer-quran-ar)
is tagged `streaming, cache-aware, quran` and reports ~**8.5% WER** on its
full finetune. 459 MB `.nemo`, so you export it yourself:

```python
model.set_export_config({'cache_support': 'True'})
model.export('fastconformer_stream.onnx')
```

Then quantize to int8 (expect ~115–190 MB) and run in a worker with
onnxruntime-web.

**Reference implementations to copy:**

- [pivoice PR #39](https://github.com/nicholas-sbx/pivoice/pull/39) —
  `src/captions/streaming-ctc.ts` + `fastconformer.worker.ts`, ONNX Runtime
  Web, 80/480/1040 ms latency configs, Vosk and Parakeet side by side
- [turn PR #11](https://github.com/shinohara-rin/turn/pull/11) — FastConformer
  in the browser, ONNX + WebGPU/WASM, in-graph mel front end
- [Stateful Conformer with cache-based inference](https://arxiv.org/pdf/2312.17279) — the paper

**Work:** 1–2 weeks. You manage encoder cache state across chunks, the mel
front end, and the streaming loop.

**Risk:** most moving parts. Mitigated by the two reference implementations.

---

### Option C — Vosk grammar mode · **simplest API, worst fit**

[`vosk-browser`](https://www.npmjs.com/package/vosk-browser) is Kaldi compiled
to WASM. True streaming, word-by-word partials every ~100–200 ms.
`KaldiRecognizer` takes an **optional grammar**: pass a JSON word list and the
WFST graph is replaced with a partial graph limited to those words, narrowing
candidates "from tens of thousands to tens of words."

Arabic models ([full list](https://alphacephei.com/vosk/models)):

| Model | Size | Dialect | WER | License |
|---|---|---|---|---|
| `vosk-model-ar-mgb2-0.4` | 318 MB | **MSA** | 16.40 (MGB-2) | Apache-2.0 |
| `vosk-model-small-ar-tn-0.1-linto` | 158 MB | Tunisian | 16.06 (TARIC) | Apache-2.0 |
| `vosk-model-ar-0.22-linto-1.1.0` | 1.3 GB | MSA | 28.50 | ⚠️ **AGPL** |

**Why it's listed third.** It was the original recommendation on the grounds
that weights existed off the shelf. That advantage disappeared once the
Quran-specific ONNX models were found. Compared with Option A it is:

- **bigger** (318 MB vs 240 MB)
- **wrong domain** — MGB-2 is Arabic *broadcast news*, not murattal recitation
- **no harakat** — you get words, not diacritics, so tashkeel checking is dead

**Still worth keeping on the list** because the grammar-constraint API is
built in and the integration is `npm install` plus a word list. If Options A
and B both stall on engineering, this is the fastest thing that could possibly
work. Enable `setWords(true)` for per-word timings.

---

### Comparison

| | **A — wav2vec2 CTC** | **B — streaming FastConformer** | **C — Vosk grammar** |
|---|---|---|---|
| Download | 240 MB | 190 MB (B1) / ~115–190 MB (B2) | 318 MB |
| Quran-trained | ✅ | B1 generic Arabic · B2 ✅ | ❌ broadcast news |
| Harakat out | ✅ | ✅ | ❌ |
| Latency | few hundred ms | **80 ms–1.1 s configurable** | 100–200 ms |
| Cache-aware | ❌ rolling recompute | ✅ | ✅ |
| Already ONNX | ✅ | ✅ B1 · ❌ B2 | n/a (WASM) |
| Work | days | 1–2 weeks | hours |
| License | ⚠️ unconfirmed | CC-BY-4.0 / Apache-2.0 | Apache-2.0 |
| Recurring cost | **$0** | **$0** | **$0** |

---

## 5. Cost

**All three cost $0/month to run.** Inference happens on the student's device.
No API calls, no GPU server, no per-minute billing, nothing that scales with
usage.

The only recurring cost is serving the model weights, and that is also free:

**Cloudflare R2** — [pricing](https://developers.cloudflare.com/r2/pricing/)

- Storage: $0.015/GB-month, **10 GB free**
- **Egress: unlimited and free**

A 240 MB model is 2.4% of the free storage tier and costs nothing to serve to
any number of students, forever. Do **not** serve weights from Vercel; Hobby
caps bandwidth at 100 GB/month and its terms are non-commercial.

Cache weights in the Cache API or IndexedDB so each device downloads once, not
once per session.

**One-time costs:**

| | |
|---|---|
| Option A / B1 / C | $0 — weights are published |
| Option B2 (ONNX export) | $0 — CPU export is fine |
| Fine-tune our own on `everyayah` | ~$10–40 GPU rental |

---

## 6. Public model inventory

Everything verified against the Hugging Face API on 8 Nov 2026.

### Ready to run

| Model | Size | Notes |
|---|---|---|
| `mostafanewir70/quran-recitation-ctc-onnx` | 240 MB q4 | **Option A.** wav2vec2 CTC, Quran, harakat, transformers.js |
| `Synthesium/...` → `fastconformer-ar-transducer` | 190 MB int8 | **Option B1.** NVIDIA Arabic FastConformer 115M, streaming, CC-BY-4.0 |
| `Synthesium/...` → `wav2vec2-ar-ctc-aligner` | 356 MB int8 | **"CTC forced alignment of known Quran text."** Per-frame logits. Apache-2.0 |
| `Synthesium/...` → `muaalem` | 651 MB int8 | Wav2Vec2-BERT 606M, multi-level phoneme CTC. **Tajwīd tier.** MIT |

Note row three: someone has already built and published exactly the
constrained-alignment component described in §2. We don't have to invent it.

### Needs export or training

| Model | Size | Notes |
|---|---|---|
| `mohammed/fastconformer-quran-ar` | 459 MB `.nemo` | **Option B2.** Cache-aware streaming, Quran, ~8.5% WER |
| `nvidia/stt_ar_fastconformer_hybrid_large_pc_v1.0` | 424 MB | Official NVIDIA Arabic, 115M, punctuation |
| `nvidia/stt_ar_fastconformer_hybrid_large_pcd_v1.0` | 459 MB | Same plus **diacritics** |
| `TBOGamer22/wav2vec2-quran-phonetics` | 378 MB | Phoneme-level, tajweed-tagged, CTC-alignment compatible |

### Datasets (if we ever train)

- **`tarteel-ai/everyayah`** — Tarteel's own published corpus, 235k downloads.
  Reported wav2vec2 result on it: **WER 0.08**.
- `tarteel-ai/tlog`, `quranlab/quran-audio`, `dev-ahmedhany/everyayah-wav`

### What Tarteel actually does

NVIDIA Riva + NeMo, FastConformer fine-tuned for Arabic to **~4% WER**, shipped
as a quantized ONNX path for browsers *and* React Native. Their React Native
app is **distribution, not capability** — the model is the moat, and they did
not publish it. They published two small Whisper finetunes from 2022
(`whisper-base-ar-quran`, Apache-2.0, 5.75% WER) and the `everyayah` dataset.
([NVIDIA case study](https://www.nvidia.com/en-gb/case-studies/automating-real-time-arabic-speech-recognition/))

---

## 7. What must be fixed in our code, whichever option wins

These are independent of the model choice. All verified against this repo.

### 7.1 🔴 `DIAC` deletes the entire Arabic alphabet

In `~/Downloads/live_reciter.html`:

```js
const DIAC = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭ࣓-ࣿـ]/g;   // BROKEN
```

The first range `ؐ-ً` is U+0610–U+064B, which swallows U+0621–U+064A: **all 43
Arabic letters.** Measured:

```
بِسْمِ       -> ""
ٱلرَّحْمَٰنِ  -> "ا"
مَٰلِكِ      -> ""
نَسْتَعِينُ  -> ""
```

`matchLive` does `if(!nr) continue;`, so **no recognized word can ever advance
the cursor.** The prototype cannot have been matching anything.

Fix — marks, tatweel and zero-width joiners only:

```js
const DIAC = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640\u200B-\u200D]/g;
// بِسْمِ -> "بسم"   ٱلرَّحْمَٰنِ -> "الرحمن"   نَسْتَعِينُ -> "نستعين"   رَيۡبَ‌ۛ -> "ريب"
```

The `\u200B-\u200D` inclusion is load-bearing: `qpc-hafs-tajweed.json`
contains **4,128 zero-width joiners**, and without folding them, 4,128 words
normalize to a bare ZWNJ and can never match recognizer output.

Verification after the fix: Al-Fatiha gives **0/29 genuine mismatches** against
the prototype's hardcoded word list.

> ⚠️ Beware the false pass. Before the fix, Al-Fatiha *also* reported 0/29,
> because both sides collapsed to `""` and trivially agreed. Any test here must
> assert the normalized value is non-empty and correct, not merely equal.

### 7.2 Expected words are not a `.split()`

`getVerseRange()` in `src/lib/quran-text.ts` returns **tajweed HTML** with
`<rule>` tags, and those tags cut words mid-word in **6,173 of 6,236 verses**
(99%); 69,873 intra-word tags in total.

```
2:30 naive whitespace split -> 47 tokens, including:
  "لِلۡمَلَ<rule"
  "class=madda_obligatory_mottasel>ـٰٓ</rule>ئِكَةِ"
```

Split only at tag depth 0, carrying tags into the token:

```ts
export function tokenizeWords(html: string): string[] {
  const out: string[] = [];
  let buf = "", depth = 0, i = 0;
  while (i < html.length) {
    if (html[i] === "<") {
      const e = html.indexOf(">", i);
      const tag = html.slice(i, e + 1);
      depth += /^<\//.test(tag) ? -1 : 1;
      buf += tag; i = e + 1; continue;
    }
    if (/\s/.test(html[i]) && depth === 0) {
      if (buf.trim()) out.push(buf);
      buf = ""; i++; continue;
    }
    buf += html[i++];
  }
  if (buf.trim()) out.push(buf);
  return out;
}
```

Verified **lossless on all 6,236 verses**: stripping tags from each token
reproduces the plain-text word list exactly. 2:30 yields 29 tokens (28 words +
the ayah number) against the naive split's 47.

Two more things must be dropped from the expected words:

- **Ayah numbers**, embedded in the verse text as Arabic-Indic numerals.
  Exactly one verse, **37:130**, does not end in one, so do not blind-`pop()`.
- **The sajdah marker** `۩` (U+06E9), which appears as a standalone token
  **15 times** (7:206 onward) — precisely the 15 places of prostration. It is a
  marker, not a word.

The robust rule covers both: after normalizing, **drop any token whose
normalized form is empty**. Measured over the corpus, that is exactly 15
tokens out of 83,683, all of them `۩`.

### 7.3 There is no per-word element to highlight

`src/components/atoms/verse-text.tsx` is a single
`dangerouslySetInnerHTML` of the whole verse. Per-word status needs a new
renderer that wraps each token from §7.2 in a span **with its `<rule>` tags
still inside**, so tajweed colouring survives alongside correct/wrong state.
Not a change to `VerseText`; a sibling component.

### 7.4 Data model: no `student_id`

The draft spec proposed `{student_id, assignment_item_id, score, word_status[]}`.
`student_id` is wrong — student accounts are being retired, so it is always
null, and `/l/<token>` has no `auth.uid()` to write with.

The existing pattern already solves this. `listen_progress`, `submissions` and
`evaluations` are **all keyed on `assignment_item_id` alone**, no `student_id`
anywhere, and all three are already in `ITEM_FIELDS` at
`src/lib/assignments.ts:39`. So:

```sql
create table recitation_attempts (
  id                 uuid primary key default gen_random_uuid(),
  assignment_item_id uuid not null references assignment_items(id) on delete cascade,
  words_total        int  not null,
  words_correct      int  not null,
  reveals            int  not null default 0,
  word_status        jsonb not null,   -- per-word: correct|tashkeel|skipped|substitution|mismatch
  engine             text not null,    -- which model produced this
  created_at         timestamptz default now()
);
```

Writes from `/l/<token>` go through a `security definer` RPC alongside
`get_lesson_by_token`, so no service-role key enters the Next.js runtime.
Add it to `ITEM_FIELDS` and it appears in the instructor workbench for free.

### 7.5 `waitMode` needs an escape hatch

Holding on a misread word is pedagogically correct — it's what a teacher does.
But a student who genuinely cannot recall is stuck forever. Add **"reveal this
word"**, and **record the reveals**: "needed 3 reveals on ayah 5" is the single
most useful thing the instructor could read before class.

---

## 8. Platform engineering checklist

Applies to all three options. These are the things that bite on a real phone.

- [ ] **Resample in an AudioWorklet.** iOS fixes `AudioContext.sampleRate` at
      the hardware rate (usually 48 kHz). Every model here wants 16 kHz mono.
      Do it in the worklet, not the main thread.
- [ ] **WASM threads need `SharedArrayBuffer`, which needs COOP + COEP response
      headers** (`next.config.js`). Caveat: COOP/COEP can break in-app
      browsers, which matters because the lesson link goes out over WhatsApp.
      Single-threaded WASM works without the headers, just slower — make
      threading an enhancement, not a requirement.
- [ ] **WebGPU is available in Safari 18+.** Use onnxruntime-web's `webgpu`
      execution provider with a `wasm` fallback. Large speedup for A and B.
- [ ] **Cache weights** in the Cache API or IndexedDB. Show real download
      progress on first open; 190–320 MB over cellular needs an honest UI.
- [ ] **`AudioContext` needs a user gesture.** One tap to start, then
      continuous.
- [ ] **Microphone vs playback on the same page.** The lesson page also plays
      the reciter's audio; on iOS, opening a mic stream can interrupt playback.
      Make listen and recite explicitly sequential, not simultaneous.
- [ ] **Test the WhatsApp in-app browser on iOS.** Tapping a link in WhatsApp
      does not open Safari. Mic access in an in-app webview depends on the host
      app's entitlements and can fail silently. Mitigation is cheap — detect it
      and show "Open in Safari" — but we need to know which way it goes.
- [ ] **HTTPS everywhere.** `getUserMedia` requires a secure context. Fine on
      Vercel; a problem only for `file://` local testing.

---

## 9. Validation plan

Ordered so the cheapest test kills the most uncertainty.

### Step 1 — offline accuracy, 20 minutes, no code, $0

Pull `mostafanewir70/quran-recitation-ctc-onnx` and run it in Python against a
handful of real murattal clips. Does it transcribe recitation, with harakat,
accurately enough to follow?

**This is the go/no-go.** It needs no browser, no integration, no app changes.
Run the same clips through the §7.1-corrected normalizer and the §2 constrained
decode to see the accuracy lift from knowing the text.

### Step 2 — cross-platform proof, one evening, $0

Static page (like `live_reciter.html`), transformers.js, weights from R2.
Open it on an iPhone and an Android. Pure WASM, so both should behave
identically — that's the point of the test.

**Exit criteria:** the cursor follows live recitation on both devices, holds on
a misread word, and the first-load download is tolerable.

### Step 3 — integrate

Apply §7.1–7.5. `matchLive` is unchanged; it becomes the cursor over CTC
alignment rather than over recognizer words. Lands on the student lesson link
page (`/l/<token>`, Part C of the instructor plan) and surfaces in the
instructor workbench via `ITEM_FIELDS`.

### Step 4 — upgrade path

Only if step 1 shows the accuracy is short: move to Option B2, or fine-tune on
`everyayah`. Same UI, same `matchLive`, only the audio-to-words layer swaps.

---

## 10. Open decisions

1. **License on `mostafanewir70/quran-recitation-ctc-onnx`** — unconfirmed.
   Must be checked before shipping Option A.
2. **Is the recitation score a grade?** Recommendation: **no.** The teacher
   grading every student is the core loop, and the post-class email derives
   pass/redo from `evaluations`. If a recitation score auto-grades, the email
   content changes and the teacher drops out of the loop. Show the instructor
   "recited 26/28 words, 2 reveals, 3 days ago" and let them still press Pass.
3. **First surface: student phone, or teacher laptop?** The laptop version has
   zero platform risk and works today (§3.1), and it fits the "teacher grades
   every student every class" loop already being built. The student-phone
   version is the bigger prize but carries the download and in-app-browser
   risks. These are not exclusive; the laptop one is nearly free once the
   engine exists.
4. **Download budget.** Is 240 MB acceptable on first open for a parent on
   cellular, or is this wifi-only / in-class-only for v1?

---

## Appendix A — measurements taken 8 Nov 2026

Against `public/text/qpc-hafs-tajweed.json` (6,236 verses) and the live
Hugging Face API.

| Measurement | Value |
|---|---|
| Arabic letters deleted by the prototype's `DIAC` class | **43 / 43** |
| Zero-width joiners in the corpus | 4,128 |
| Words normalizing to a bare ZWNJ without the fix | 4,128 |
| Intra-word `<rule>` tags | 69,873 |
| Verses with at least one intra-word tag | **6,173 / 6,236** |
| Verses tokenized losslessly by §7.2 | **6,236 / 6,236** |
| 2:30 — naive split vs tokenizer | 47 vs 29 tokens |
| Verses not ending in an Arabic-Indic ayah number | 1 (**37:130**) |
| Words normalizing to empty (all the sajdah marker U+06E9) | 15 / 83,683 |
| Words still carrying a zero-width char after the fix | **0** |
| Al-Fatiha genuine mismatches, corrected normalizer | **0 / 29** |

## Appendix B — existing assets

| Path | What it is |
|---|---|
| `~/Downloads/live_reciter.html` | The working prototype. `matchLive` is sound; `DIAC` is broken (§7.1). Hardcodes Al-Fatiha as clean word arrays. |
| `~/workspace/voice-recitation-backend` | Express + Groq Whisper v3 Turbo, plus `verseMatchingService.js`. Batch architecture — superseded. |
| `~/workspace/voice-recitation-frontend` | Vite + React. `useAudioRecorder`, `useChunkedRecorder`, correct mime-type ladder including `audio/mp4` for Safari. See Appendix C. |

`matchLive` itself is worth keeping verbatim: recompute from scratch over the
whole recognized-word list on every event, look ahead two words for skips,
look behind one to ignore repeats, never stop on a mistake. Port it to
`src/lib/recitation.ts` as pure functions.

## Appendix C — bug in the existing chunked recorder

Only relevant if we revisit record-and-send. In
`voice-recitation-frontend/src/hooks/useChunkedRecorder.js:118`:

```js
mediaRecorder.start(2000);   // each ondataavailable blob sent standalone
```

**MediaRecorder timeslice blobs are not independently decodable — only the
first carries the container header.** So chunk 1 transcribes and chunks 2+ are
headerless fragments. The documented fix is to stop and start a new
`MediaRecorder` on the same mic stream at each chunk boundary, so every chunk
is a complete file.

Related: `App.jsx:201` names every chunk `chunk-N.webm` even when the blob is
`audio/mp4`, which is what Safari produces.

Also note the rate arithmetic: 2-second chunks are 30 requests/minute for a
*single* reciting student, against a 20 req/min free-tier ceiling.

---

## Sources

- [W3C speech-api issue 66 — no MediaStream input](https://github.com/w3c/speech-api/issues/66)
- [Apple Developer Forums — interimResults on WebKit](https://developer.apple.com/forums/thread/775699)
- [iOS browser engines in 2026](https://browserpedia.com/ios-browser-engines)
- [NVIDIA case study — Tarteel](https://www.nvidia.com/en-gb/case-studies/automating-real-time-arabic-speech-recognition/)
- [NeMo ASR checkpoints](https://docs.nvidia.com/nemo-framework/user-guide/latest/nemotoolkit/asr/all_chkpt.html)
- [Stateful Conformer with cache-based inference](https://arxiv.org/pdf/2312.17279)
- [pivoice PR #39 — streaming CTC in the browser](https://github.com/nicholas-sbx/pivoice/pull/39)
- [turn PR #11 — FastConformer ONNX WebGPU/WASM](https://github.com/shinohara-rin/turn/pull/11)
- [vosk-browser KaldiRecognizer](https://deepwiki.com/ccoreilly/vosk-browser/2.2-kaldirecognizer-class)
- [Vosk model list](https://alphacephei.com/vosk/models)
- [Cloudflare R2 pricing](https://developers.cloudflare.com/r2/pricing/)
- [Safari MP4 chunk fix](https://github.com/jamesBenja/breakglass-after-hours/pull/100)
