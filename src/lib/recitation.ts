// Recitation matching engine — pure functions, no React, no browser APIs.
//
// Ported from the live_reciter.html prototype with two corrections:
//
//  1. The prototype's diacritic class was /[\u0610-\u064B ...]/, whose first
//     range swallows U+0621-U+064A — every Arabic letter. Every word
//     normalized to "" and the cursor could never advance. See DIACRITICS.
//  2. Expected words come from the tajweed JSON, where <rule> tags split words
//     mid-word in 6,173 of 6,236 verses, so a whitespace split is wrong.
//     See tokenizeWords.

/**
 * Combining marks, tatweel and zero-width joiners — and nothing else.
 *
 * Ranges: Quranic annotation marks (0610-061A), harakat and the Quranic
 * superscript set (064B-065F), superscript alef (0670), the small high marks
 * including sukun U+06E1 and the sajdah sign (06D6-06ED), Arabic Extended-A
 * (08D3-08FF), tatweel (0640), and ZWSP/ZWNJ/ZWJ (200B-200D).
 *
 * The zero-width range is load-bearing: the corpus holds 4,128 of them, and
 * without folding them 4,128 words can never match recognizer output.
 */
const DIACRITICS =
  /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF\u0640\u200B-\u200D]/g;

/** Letter forms that recognizers spell inconsistently, folded to one form. */
const LETTER_FOLD: Record<string, string> = {
  "\u0622": "\u0627", // alef with madda  -> alef
  "\u0623": "\u0627", // alef with hamza above
  "\u0625": "\u0627", // alef with hamza below
  "\u0671": "\u0627", // alef wasla
  "\u0649": "\u064A", // alef maksura     -> ya
  "\u0629": "\u0647", // ta marbuta       -> ha
  "\u0624": "\u0648", // waw with hamza   -> waw
  "\u0626": "\u064A", // ya with hamza    -> ya
};

const FOLDABLE = /[\u0622\u0623\u0625\u0671\u0649\u0629\u0624\u0626]/g;

const HTML_TAG = /<[^>]*>/g;

/** Arabic-Indic digits, used as ayah numbers inside the verse text. */
const ARABIC_INDIC_ONLY = /^[\u0660-\u0669]+$/;

function fold(s: string): string {
  return s.replace(FOLDABLE, (c) => LETTER_FOLD[c] ?? c);
}

/** Strip HTML tags, leaving bare text. */
export function stripTags(s: string): string {
  return s.replace(HTML_TAG, "");
}

/** Remove every diacritic, tatweel and zero-width character. */
export function stripDiacritics(w: string): string {
  return w.normalize("NFC").replace(DIACRITICS, "");
}

/** Comparison form: no diacritics, letters folded. */
export function normalizeWord(w: string): string {
  return fold(stripDiacritics(w)).trim();
}

/** Keeps harakat so tashkeel can be compared; folds letters and drops tatweel. */
export function vocalized(w: string): string {
  return fold(w.normalize("NFC").replace(/\u0640/g, "")).trim();
}

/** Normalized Levenshtein similarity in [0,1]. Used to tell a near-miss from a wrong word. */
export function similarity(a: string, b: string): number {
  if (!a.length && !b.length) return 1;
  if (!a.length || !b.length) return 0;
  const m = a.length;
  const n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const row = [i, ...Array<number>(n).fill(0)];
    for (let j = 1; j <= n; j++) {
      row[j] = Math.min(
        prev[j] + 1,
        row[j - 1] + 1,
        prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
      );
    }
    prev = row;
  }
  return 1 - prev[n] / Math.max(m, n);
}

/**
 * Split tajweed HTML into word tokens, splitting only on whitespace that sits
 * outside a tag so each token keeps its own <rule> markup.
 *
 * A naive split of 2:30 yields 47 fragments like `لِلۡمَلَ<rule`; this yields 29.
 * Verified lossless across all 6,236 verses.
 */
export function tokenizeWords(html: string): string[] {
  const out: string[] = [];
  let buf = "";
  let depth = 0;
  let i = 0;
  while (i < html.length) {
    if (html[i] === "<") {
      const end = html.indexOf(">", i);
      if (end === -1) {
        buf += html.slice(i);
        break;
      }
      const tag = html.slice(i, end + 1);
      depth += tag.startsWith("</") ? -1 : 1;
      if (depth < 0) depth = 0;
      buf += tag;
      i = end + 1;
      continue;
    }
    if (/\s/.test(html[i]) && depth === 0) {
      if (buf.trim()) out.push(buf);
      buf = "";
      i++;
      continue;
    }
    buf += html[i++];
  }
  if (buf.trim()) out.push(buf);
  return out;
}

export interface Verse {
  surah: number;
  verse: number;
  text: string;
}

export interface ExpectedWord {
  /** Original token including <rule> tags, for rendering. */
  html: string;
  /** Tag-stripped text. */
  plain: string;
  /** Comparison form. */
  norm: string;
  /** Diacritics kept, for tashkeel comparison. */
  voc: string;
  surah: number;
  verse: number;
  /** True for the last word of its verse, so the ayah mark can follow it. */
  lastInVerse: boolean;
}

/**
 * Flatten verses into the expected word list.
 *
 * Drops anything that is not a recitable word: the embedded ayah numbers
 * (every verse but 37:130 ends in one) and the sajdah sign U+06E9, which
 * appears standalone exactly 15 times. The catch-all rule is "normalizes to
 * empty", which covers both and anything else like them.
 */
export function expectedWordsFromVerses(verses: Verse[]): ExpectedWord[] {
  const out: ExpectedWord[] = [];
  for (const v of verses) {
    const tokens = tokenizeWords(v.text);
    const words = tokens
      .map((html) => {
        const plain = stripTags(html).trim();
        return { html, plain, norm: normalizeWord(plain), voc: vocalized(plain) };
      })
      .filter((w) => w.norm.length > 0 && !ARABIC_INDIC_ONLY.test(w.plain));
    words.forEach((w, idx) =>
      out.push({ ...w, surah: v.surah, verse: v.verse, lastInVerse: idx === words.length - 1 }),
    );
  }
  return out;
}

export type WordStatus =
  | "pending"
  | "correct"
  | "tashkeel"
  | "skipped"
  | "substitution"
  | "mismatch"
  | "revealed";

export interface MatchState {
  status: WordStatus[];
  /** Index of the word being listened for. Equals expected.length when complete. */
  cursor: number;
  /** True when holding on a misread word in wait mode. */
  waiting: boolean;
  /** First index that went wrong, or null. */
  firstBad: number | null;
}

/** How near a wrong word must be to count as a substitution rather than a mismatch. */
const SUBSTITUTION_THRESHOLD = 0.7;

/** How far ahead to look when deciding whether words were skipped. */
const LOOKAHEAD = 2;

/**
 * Walk the whole recognized-word list and place the cursor.
 *
 * Recomputed from scratch on every recognition event, over finals *and*
 * interims, so the cursor tracks the voice live instead of waiting for the
 * recognizer to finalize a segment.
 *
 * Never stops on a mistake. In wait mode the cursor holds on the misread word
 * and keeps listening; otherwise the word is flagged and the cursor moves on.
 *
 * `revealed` indices are treated as already satisfied, so a student who cannot
 * recall a word is not trapped.
 */
export function matchLive(
  expected: ExpectedWord[],
  recognized: string[],
  waitMode: boolean,
  revealed?: ReadonlySet<number>,
): MatchState {
  const status: WordStatus[] = expected.map(() => "pending");
  let cursor = 0;
  let waiting = false;
  let firstBad: number | null = null;

  const skipRevealed = () => {
    while (revealed?.has(cursor) && cursor < expected.length) {
      status[cursor] = "revealed";
      cursor++;
    }
  };

  skipRevealed();

  for (const raw of recognized) {
    if (cursor >= expected.length) break;
    const heard = normalizeWord(raw);
    if (!heard) continue;

    const current = expected[cursor];

    // Correct word. Flag tashkeel only when the recognizer actually returned
    // vowels, otherwise every engine without diacritics looks like an error.
    if (heard === current.norm) {
      const heardVoc = vocalized(raw);
      const heardHasVowels = heardVoc !== heard;
      status[cursor] =
        heardHasVowels && heardVoc !== current.voc ? "tashkeel" : "correct";
      cursor++;
      waiting = false;
      skipRevealed();
      continue;
    }

    // Look ahead: did they skip a word or two?
    let advanced = false;
    for (let k = 1; k <= LOOKAHEAD; k++) {
      if (cursor + k < expected.length && heard === expected[cursor + k].norm) {
        for (let s = 0; s < k; s++) status[cursor + s] = "skipped";
        status[cursor + k] = "correct";
        if (firstBad === null) firstBad = cursor;
        cursor += k + 1;
        waiting = false;
        advanced = true;
        break;
      }
    }
    if (advanced) {
      skipRevealed();
      continue;
    }

    // Look behind: a repeat of the previous word is normal recitation, ignore it.
    if (cursor > 0 && heard === expected[cursor - 1].norm) continue;

    // A wrong attempt at the current word.
    if (firstBad === null) firstBad = cursor;
    if (waitMode) {
      waiting = true;
      continue;
    }
    status[cursor] =
      similarity(heard, current.norm) >= SUBSTITUTION_THRESHOLD
        ? "substitution"
        : "mismatch";
    cursor++;
    waiting = false;
    skipRevealed();
  }

  return { status, cursor, waiting, firstBad };
}

/** Counts for the attempt record and the instructor's summary. */
export function scoreOf(state: MatchState) {
  const correct = state.status.filter((s) => s === "correct").length;
  const tashkeel = state.status.filter((s) => s === "tashkeel").length;
  const revealed = state.status.filter((s) => s === "revealed").length;
  const wrong = state.status.filter(
    (s) => s === "skipped" || s === "substitution" || s === "mismatch",
  ).length;
  return { correct, tashkeel, revealed, wrong, total: state.status.length };
}
