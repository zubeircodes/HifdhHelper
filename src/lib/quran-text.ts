// Load verse text from the static JSON files.
// Returns the raw HTML string with <rule> tags for tajweed.

let cache: Record<string, { text: string }> | null = null;

export async function loadQuranData(): Promise<Record<string, { text: string }>> {
  if (cache) return cache;
  const res = await fetch("/text/qpc-hafs-tajweed.json");
  cache = await res.json();
  return cache!;
}

export async function getVerseText(surah: number, verse: number): Promise<string> {
  const data = await loadQuranData();
  const key = `${surah}:${verse}`;
  return data[key]?.text || `[Verse ${key} not found]`;
}

export async function getVerseRange(
  startSurah: number, startVerse: number,
  endSurah: number, endVerse: number
): Promise<{ surah: number; verse: number; text: string }[]> {
  const data = await loadQuranData();
  const verses: { surah: number; verse: number; text: string }[] = [];

  // We need surah verse counts to iterate across surahs
  const { SURAHS } = await import("./quran-meta");

  for (let sn = startSurah; sn <= endSurah; sn++) {
    const surahMeta = SURAHS.find((s) => s.number === sn);
    if (!surahMeta) continue;
    const first = sn === startSurah ? startVerse : 1;
    const last = sn === endSurah ? endVerse : surahMeta.verses;
    for (let vn = first; vn <= last; vn++) {
      const key = `${sn}:${vn}`;
      verses.push({
        surah: sn,
        verse: vn,
        text: data[key]?.text || `[${key}]`,
      });
    }
  }

  return verses;
}
