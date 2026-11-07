// Shared formatting helpers. Before this file these were copy-pasted across
// seven instructor pages; `todayISO` additionally fixes a UTC date bug.

import { getSurah } from "@/lib/quran-meta";

export function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "??";
  return parts.length >= 2
    ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    : parts[0].slice(0, 2).toUpperCase();
}

export function surahName(num: number): string {
  return getSurah(num)?.name ?? `Surah ${num}`;
}

/** "Al-Baqarah · 2:30–35", or "Al-Baqarah · 2:30" for a single ayah. */
export function formatAyahRange(item: {
  surah: number;
  start_ayah: number;
  end_ayah: number;
}): string {
  const name = surahName(item.surah);
  const range =
    item.start_ayah === item.end_ayah
      ? `${item.surah}:${item.start_ayah}`
      : `${item.surah}:${item.start_ayah}–${item.end_ayah}`;
  return `${name} · ${range}`;
}

/**
 * Today as YYYY-MM-DD in the LOCAL timezone.
 *
 * `new Date().toISOString().split("T")[0]` is UTC, so an instructor west of UTC
 * teaching in the evening files the assignment under tomorrow's date. Every
 * due-date and queue calculation reads `assignments.date`, so that one-day skew
 * reaches the whole product.
 */
export function todayISO(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** ISO date shifted by whole days, still local. */
export function shiftISODays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  return todayISO(new Date(y, m - 1, d + days));
}

/** "Tue 5 Nov" — short, unambiguous, no locale surprises in email subjects. */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

export function daysAgoLabel(iso: string, today: string = todayISO()): string {
  const diff = Math.round(
    (Date.parse(`${today}T00:00:00`) - Date.parse(`${iso}T00:00:00`)) / 86_400_000
  );
  if (diff <= 0) return "Today";
  if (diff === 1) return "Yesterday";
  return `${diff} days ago`;
}
