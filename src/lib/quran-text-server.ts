// Server-side Quran text loading for static/server-rendered pages.
import fs from "fs";
import path from "path";

let cache: Record<string, { text: string }> | null = null;

export function loadQuranDataSync(): Record<string, { text: string }> {
  if (cache) return cache;
  const filePath = path.join(process.cwd(), "public", "text", "qpc-hafs-tajweed.json");
  const raw = fs.readFileSync(filePath, "utf-8");
  cache = JSON.parse(raw);
  return cache!;
}

export function getVerseTextSync(surah: number, verse: number): string {
  const data = loadQuranDataSync();
  const key = `${surah}:${verse}`;
  return data[key]?.text || "";
}
