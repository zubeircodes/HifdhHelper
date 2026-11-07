// Ayah-range validation, lifted verbatim from the New Assignment page so the
// bulk screen and the workbench's inline assign panel share one implementation.

import { getSurah } from "@/lib/quran-meta";

export interface RangeInput {
  startSurah: number;
  startVerse: number;
  endSurah: number;
  endVerse: number;
}

export interface RangeResult {
  errors: string[];
  valid: boolean;
  totalAyat: number;
}

export function validateRange(input: RangeInput): RangeResult {
  const { startSurah: ss, endSurah: es, startVerse: sv, endVerse: ev } = input;
  const start = getSurah(ss);
  const end = getSurah(es);
  const errors: string[] = [];

  if (!start) return { errors: ["Invalid start surah."], valid: false, totalAyat: 0 };
  if (!end) return { errors: ["Invalid end surah."], valid: false, totalAyat: 0 };

  if (sv < 1) errors.push("Start verse must be at least 1.");
  if (sv > start.verses) errors.push(`${start.name} only has ${start.verses} verses.`);
  if (ev < 1) errors.push("End verse must be at least 1.");
  if (ev > end.verses) errors.push(`${end.name} only has ${end.verses} verses.`);
  if (es < ss) errors.push("End surah cannot be before start surah.");
  else if (ss === es && ev < sv) errors.push("End verse must be after start verse.");

  let totalAyat = 0;
  if (errors.length === 0) {
    for (let sn = ss; sn <= es; sn++) {
      const s = getSurah(sn)!;
      const first = sn === ss ? sv : 1;
      const last = sn === es ? ev : s.verses;
      totalAyat += last - first + 1;
    }
  }

  return { errors, valid: errors.length === 0, totalAyat };
}

/**
 * `assignment_items` stores ONE `surah` column, so a lesson cannot span surahs.
 * The bulk-assign form lets you pick an end surah and then silently drops it,
 * which already stores cross-surah assignments wrong. New surfaces must refuse
 * the range rather than quietly truncate it.
 */
export function isSingleSurah(input: RangeInput): boolean {
  return input.startSurah === input.endSurah;
}
