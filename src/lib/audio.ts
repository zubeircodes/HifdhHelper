// Audio playback via everyayah.com — matches the old app's approach.

const EVERYAYAH_BASE = "https://everyayah.com/data";

export interface Reciter {
  id: string;
  name: string;
}

// Folder names on everyayah.com. Add more here; no migration needed.
export const RECITERS: Reciter[] = [
  { id: "Alafasy_64kbps", name: "Mishary Alafasy" },
  { id: "Husary_64kbps", name: "Mahmoud Al-Hussary" },
  { id: "Minshawy_Murattal_128kbps", name: "Mohamed Al-Minshawy" },
];

export const DEFAULT_RECITER = RECITERS[0].id;

export function getAudioUrl(reciter: string, surah: number, verse: number): string {
  const surahPadded = String(surah).padStart(3, "0");
  const versePadded = String(verse).padStart(3, "0");
  return `${EVERYAYAH_BASE}/${reciter}/${surahPadded}${versePadded}.mp3`;
}
