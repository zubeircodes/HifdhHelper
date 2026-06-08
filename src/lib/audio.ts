// Audio playback via everyayah.com — matches the old app's approach.

const EVERYAYAH_BASE = "https://everyayah.com/data";

export function getAudioUrl(reciter: string, surah: number, verse: number): string {
  const surahPadded = String(surah).padStart(3, "0");
  const versePadded = String(verse).padStart(3, "0");
  return `${EVERYAYAH_BASE}/${reciter}/${surahPadded}${versePadded}.mp3`;
}
