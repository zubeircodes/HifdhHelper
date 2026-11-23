// Recite-from-memory test — pure state transitions, no React, no audio.
//
// The text starts hidden. Each recognized word is judged against the word the
// student is due to recite: a match reveals it, anything else is a wrong
// attempt and the student can retry or ask to see the word. Scoring is per
// word: first try 1, after a wrong attempt ½, shown or skipped 0.

import {
  normalizeWord,
  similarity,
  type ExpectedWord,
} from "./recitation";

export type WordOutcome =
  | "pending"
  /** Recited correctly, first try. */
  | "correct"
  /** Recited correctly after at least one wrong attempt. */
  | "retried"
  /** Student asked to see it. */
  | "revealed"
  /** Student went on to a later word without reciting this one. */
  | "skipped"
  /** Test ended before the student reached it. */
  | "unreached";

export interface WordResult {
  outcome: WordOutcome;
  /** What the recognizer heard on each wrong attempt, in order. */
  heard: string[];
}

export interface TestState {
  words: WordResult[];
  /** Index of the word due next. Equals words.length when complete. */
  cursor: number;
  /** The most recent wrong attempt at the current word, for the "Not quite" prompt. */
  lastWrong: string | null;
  /** The start of the current word, heard on its own; held to join with what follows. */
  carry: { norm: string; raw: string } | null;
  /** The unheard end of the word just matched, ignored if it arrives as a word of its own. */
  tail: string | null;
  done: boolean;
}

/**
 * Near enough to count as recited. Matches the live matcher's substitution
 * threshold: on the benchmark, every correctly recited word of 84 professional
 * clips cleared it, and 2.9% of them would have failed an exact comparison
 * through spelling variants alone. Tashkeel is not judged here; the model's
 * vowel error rate (2.8%) would flag correct recitation.
 */
const MATCH_THRESHOLD = 0.7;

/** How far ahead a heard word may land and count as skipping the ones between. */
const LOOKAHEAD = 2;

/** Isti'adha and basmala, often recited before starting; ignored before the first word. */
const OPENING = new Set(
  "أعوذ بالله من الشيطان الرجيم بسم الله الرحمن الرحيم".split(" ").map(normalizeWord),
);

export function initialTest(count: number): TestState {
  return {
    words: Array.from({ length: count }, () => ({ outcome: "pending" as const, heard: [] })),
    cursor: 0,
    lastWrong: null,
    carry: null,
    tail: null,
    done: count === 0,
  };
}

/**
 * Accepted spellings of a word. A word written with hamzat al-wasl (ٱ) loses
 * that alef in connected recitation, so «ٱلرَّحِيمِ» after «بِسْمِ ٱللَّهِ» is
 * heard, correctly, as «لرحيم».
 */
function forms(expected: ExpectedWord): string[] {
  const out = [expected.norm, expected.altNorm];
  if (expected.plain.startsWith("\u0671")) out.push(expected.norm.slice(1), expected.altNorm.slice(1));
  return out;
}

function matches(expected: ExpectedWord, heard: string): boolean {
  const fs = forms(expected);
  return fs.includes(heard) || fs.some((f) => similarity(heard, f) >= MATCH_THRESHOLD);
}

/** A proper prefix of the expected word: the word may still be arriving. */
function startsWord(expected: ExpectedWord, heard: string): boolean {
  return forms(expected).some((f) => heard.length < f.length && f.startsWith(heard));
}

/** A held prefix long enough that, followed by the next word, it was this word with its end clipped. */
const CLIPPED_COVERAGE = 0.6;

/** The article carries no recall: «الح» is one letter of «الحمد», not three of five. */
function stem(w: string): string {
  return w.replace(/^(ال|ل)/, "");
}

function coversMost(expected: ExpectedWord, heard: string): boolean {
  return forms(expected).some(
    (f) => f.startsWith(heard) && stem(heard).length >= 2 && stem(heard).length / stem(f).length >= CLIPPED_COVERAGE,
  );
}

/**
 * Two words the recognizer ran together, mostly across the pause between ayat:
 * «الرحيمالحمد». Returns the split where the first part is this word and the
 * rest is (the start of) the next one, or null.
 */
function splitMerged(expected: ExpectedWord[], i: number, heard: string): [string, string] | null {
  const next = expected[i + 1];
  if (!next) return null;
  let best: [string, string] | null = null;
  let bestScore = 0;
  for (let k = 2; k <= heard.length - 2; k++) {
    const a = heard.slice(0, k);
    const b = heard.slice(k);
    if (!matches(expected[i], a) || !(matches(next, b) || startsWord(next, b))) continue;
    const score = Math.max(...forms(expected[i]).map((f) => similarity(a, f)));
    if (score > bestScore) { bestScore = score; best = [a, b]; }
  }
  return best;
}

/** What is left of `word` after the part of it `heard` covers. */
function remainder(word: string, heard: string): string | null {
  let k = 0;
  while (k < heard.length && k < word.length && heard[k] === word[k]) k++;
  return k < word.length ? word.slice(k) : null;
}

function withWord(s: TestState, i: number, patch: Partial<WordResult>): WordResult[] {
  const words = s.words.slice();
  words[i] = { ...words[i], ...patch };
  return words;
}

function advance(s: TestState, words: WordResult[], cursor: number): TestState {
  return { words, cursor, lastWrong: null, carry: null, tail: null, done: cursor >= words.length };
}

/**
 * Judge one recognized word.
 *
 * The recognizer sometimes ends a word early, mostly after a long madd, and
 * delivers the rest as a word of its own: «الرحي» then «م». So a prefix of the
 * expected word is held and joined to the next piece instead of being judged
 * wrong, and the leftover end of a word already matched is ignored.
 */
export function hear(s: TestState, expected: ExpectedWord[], raw: string): TestState {
  if (s.done) return s;
  const heard = normalizeWord(raw);
  if (!heard) return s;

  if (s.tail) {
    const tail = s.tail;
    s = { ...s, tail: null };
    if (tail.startsWith(heard) || similarity(heard, tail) >= MATCH_THRESHOLD) return s;
  }

  if (s.carry) {
    const held = s.carry;
    const joined = held.norm + heard;
    const cur = expected[s.cursor];
    if (matches(cur, joined) || startsWord(cur, joined)) {
      return judge({ ...s, carry: null }, expected, joined, held.raw + raw);
    }
    const next = expected[s.cursor + 1];
    if (next && coversMost(cur, held.norm) && (matches(next, heard) || startsWord(next, heard))) {
      // The end of this word was clipped, and the student has moved on to the next.
      const outcome = s.words[s.cursor].heard.length ? "retried" : "correct";
      s = advance(s, withWord(s, s.cursor, { outcome }), s.cursor + 1);
    } else {
      // Not the start of this word after all: judge it alone, then this piece.
      s = judge({ ...s, carry: null }, expected, held.norm, held.raw, false);
    }
    if (s.done) return s;
  }

  return judge(s, expected, heard, raw);
}

function judge(s: TestState, expected: ExpectedWord[], heard: string, raw: string, mayHold = true): TestState {
  const i = s.cursor;

  // Clearly longer than this word: try it as two words before anything else,
  // or a merge like «المستقيراط» clears the similarity bar for this word alone
  // and swallows the next.
  const longest = Math.max(...forms(expected[i]).map((f) => f.length));
  const split = heard.length >= longest + 2 ? splitMerged(expected, i, heard) : null;
  if (split) {
    const after = judge(s, expected, split[0], split[0]);
    return after.done ? after : judge(after, expected, split[1], split[1]);
  }

  if (matches(expected[i], heard)) {
    const outcome = s.words[i].heard.length ? "retried" : "correct";
    const form = forms(expected[i]).find((f) => f.startsWith(heard.slice(0, 2))) ?? expected[i].norm;
    return { ...advance(s, withWord(s, i, { outcome }), i + 1), tail: remainder(form, heard) };
  }

  if (mayHold && startsWord(expected[i], heard)) return { ...s, carry: { norm: heard, raw } };

  // Before the skip check: the basmala's «الله» would otherwise match a later
  // «الله» in the ayah and mark everything before it skipped.
  if (i === 0 && OPENING.has(heard)) return s;

  const merged = splitMerged(expected, i, heard);
  if (merged) {
    const after = judge(s, expected, merged[0], merged[0]);
    return after.done ? after : judge(after, expected, merged[1], merged[1]);
  }

  for (let k = 1; k <= LOOKAHEAD && i + k < expected.length; k++) {
    if (matches(expected[i + k], heard)) {
      const words = s.words.slice();
      for (let j = i; j < i + k; j++) words[j] = { ...words[j], outcome: "skipped" };
      const outcome = words[i + k].heard.length ? "retried" : "correct";
      words[i + k] = { ...words[i + k], outcome };
      return advance(s, words, i + k + 1);
    }
  }

  // Repeating the previous word is normal recitation, not a mistake.
  if (i > 0 && matches(expected[i - 1], heard)) return s;
  // Single letters are almost always breath or a clipped edge, not a guess.
  if (heard.length < 2) return s;

  return { ...s, words: withWord(s, i, { heard: [...s.words[i].heard, raw] }), lastWrong: raw };
}

/** Show the current word and move on. */
export function reveal(s: TestState): TestState {
  if (s.done) return s;
  return advance(s, withWord(s, s.cursor, { outcome: "revealed" }), s.cursor + 1);
}

/** End the test early; everything not yet reached is marked so. */
export function finish(s: TestState): TestState {
  const words = s.words.map((w) => (w.outcome === "pending" ? { ...w, outcome: "unreached" as const } : w));
  return { ...s, words, lastWrong: null, done: true };
}

export function isFailed(o: WordOutcome): boolean {
  return o !== "correct" && o !== "pending";
}

export interface TestScore {
  /** 0–100. */
  percent: number;
  correct: number;
  retried: number;
  revealed: number;
  skipped: number;
  unreached: number;
  total: number;
}

export function scoreTest(s: TestState): TestScore {
  const n = (o: WordOutcome) => s.words.filter((w) => w.outcome === o).length;
  const correct = n("correct");
  const retried = n("retried");
  const total = s.words.length;
  return {
    percent: total ? Math.round(((correct + retried * 0.5) / total) * 100) : 0,
    correct,
    retried,
    revealed: n("revealed"),
    skipped: n("skipped"),
    unreached: n("unreached"),
    total,
  };
}

export function scoreLabel(percent: number): string {
  if (percent >= 95) return "Excellent";
  if (percent >= 85) return "Very good";
  if (percent >= 70) return "Good — review the marked words";
  if (percent >= 50) return "Needs more review";
  return "Keep listening, then try again";
}
