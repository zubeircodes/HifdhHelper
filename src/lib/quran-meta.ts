// All 114 surahs with verse counts. Source of truth for validation.

export interface Surah {
  number: number;
  name: string;
  nameArabic: string;
  verses: number;
}

export const SURAHS: Surah[] = [
  { number: 1, name: "Al-Fatihah", nameArabic: "الفاتحة", verses: 7 },
  { number: 2, name: "Al-Baqarah", nameArabic: "البقرة", verses: 286 },
  { number: 3, name: "Ali 'Imran", nameArabic: "آل عمران", verses: 200 },
  { number: 4, name: "An-Nisa", nameArabic: "النساء", verses: 176 },
  { number: 5, name: "Al-Ma'idah", nameArabic: "المائدة", verses: 120 },
  { number: 6, name: "Al-An'am", nameArabic: "الأنعام", verses: 165 },
  { number: 7, name: "Al-A'raf", nameArabic: "الأعراف", verses: 206 },
  { number: 8, name: "Al-Anfal", nameArabic: "الأنفال", verses: 75 },
  { number: 9, name: "At-Tawbah", nameArabic: "التوبة", verses: 129 },
  { number: 10, name: "Yunus", nameArabic: "يونس", verses: 109 },
  { number: 11, name: "Hud", nameArabic: "هود", verses: 123 },
  { number: 12, name: "Yusuf", nameArabic: "يوسف", verses: 111 },
  { number: 13, name: "Ar-Ra'd", nameArabic: "الرعد", verses: 43 },
  { number: 14, name: "Ibrahim", nameArabic: "ابراهيم", verses: 52 },
  { number: 15, name: "Al-Hijr", nameArabic: "الحجر", verses: 99 },
  { number: 16, name: "An-Nahl", nameArabic: "النحل", verses: 128 },
  { number: 17, name: "Al-Isra", nameArabic: "الإسراء", verses: 111 },
  { number: 18, name: "Al-Kahf", nameArabic: "الكهف", verses: 110 },
  { number: 19, name: "Maryam", nameArabic: "مريم", verses: 98 },
  { number: 20, name: "Taha", nameArabic: "طه", verses: 135 },
  { number: 21, name: "Al-Anbya", nameArabic: "الأنبياء", verses: 112 },
  { number: 22, name: "Al-Hajj", nameArabic: "الحج", verses: 78 },
  { number: 23, name: "Al-Mu'minun", nameArabic: "المؤمنون", verses: 118 },
  { number: 24, name: "An-Nur", nameArabic: "النور", verses: 64 },
  { number: 25, name: "Al-Furqan", nameArabic: "الفرقان", verses: 77 },
  { number: 26, name: "Ash-Shu'ara", nameArabic: "الشعراء", verses: 227 },
  { number: 27, name: "An-Naml", nameArabic: "النمل", verses: 93 },
  { number: 28, name: "Al-Qasas", nameArabic: "القصص", verses: 88 },
  { number: 29, name: "Al-'Ankabut", nameArabic: "العنكبوت", verses: 69 },
  { number: 30, name: "Ar-Rum", nameArabic: "الروم", verses: 60 },
  { number: 31, name: "Luqman", nameArabic: "لقمان", verses: 34 },
  { number: 32, name: "As-Sajdah", nameArabic: "السجدة", verses: 30 },
  { number: 33, name: "Al-Ahzab", nameArabic: "الأحزاب", verses: 73 },
  { number: 34, name: "Saba", nameArabic: "سبإ", verses: 54 },
  { number: 35, name: "Fatir", nameArabic: "فاطر", verses: 45 },
  { number: 36, name: "Ya-Sin", nameArabic: "يس", verses: 83 },
  { number: 37, name: "As-Saffat", nameArabic: "الصافات", verses: 182 },
  { number: 38, name: "Sad", nameArabic: "ص", verses: 88 },
  { number: 39, name: "Az-Zumar", nameArabic: "الزمر", verses: 75 },
  { number: 40, name: "Ghafir", nameArabic: "غافر", verses: 85 },
  { number: 41, name: "Fussilat", nameArabic: "فصلت", verses: 54 },
  { number: 42, name: "Ash-Shuraa", nameArabic: "الشورى", verses: 53 },
  { number: 43, name: "Az-Zukhruf", nameArabic: "الزخرف", verses: 89 },
  { number: 44, name: "Ad-Dukhan", nameArabic: "الدخان", verses: 59 },
  { number: 45, name: "Al-Jathiyah", nameArabic: "الجاثية", verses: 37 },
  { number: 46, name: "Al-Ahqaf", nameArabic: "الأحقاف", verses: 35 },
  { number: 47, name: "Muhammad", nameArabic: "محمد", verses: 38 },
  { number: 48, name: "Al-Fath", nameArabic: "الفتح", verses: 29 },
  { number: 49, name: "Al-Hujurat", nameArabic: "الحجرات", verses: 18 },
  { number: 50, name: "Qaf", nameArabic: "ق", verses: 45 },
  { number: 51, name: "Adh-Dhariyat", nameArabic: "الذاريات", verses: 60 },
  { number: 52, name: "At-Tur", nameArabic: "الطور", verses: 49 },
  { number: 53, name: "An-Najm", nameArabic: "النجم", verses: 62 },
  { number: 54, name: "Al-Qamar", nameArabic: "القمر", verses: 55 },
  { number: 55, name: "Ar-Rahman", nameArabic: "الرحمن", verses: 78 },
  { number: 56, name: "Al-Waqi'ah", nameArabic: "الواقعة", verses: 96 },
  { number: 57, name: "Al-Hadid", nameArabic: "الحديد", verses: 29 },
  { number: 58, name: "Al-Mujadila", nameArabic: "المجادلة", verses: 22 },
  { number: 59, name: "Al-Hashr", nameArabic: "الحشر", verses: 24 },
  { number: 60, name: "Al-Mumtahanah", nameArabic: "الممتحنة", verses: 13 },
  { number: 61, name: "As-Saf", nameArabic: "الصف", verses: 14 },
  { number: 62, name: "Al-Jumu'ah", nameArabic: "الجمعة", verses: 11 },
  { number: 63, name: "Al-Munafiqun", nameArabic: "المنافقون", verses: 11 },
  { number: 64, name: "At-Taghabun", nameArabic: "التغابن", verses: 18 },
  { number: 65, name: "At-Talaq", nameArabic: "الطلاق", verses: 12 },
  { number: 66, name: "At-Tahrim", nameArabic: "التحريم", verses: 12 },
  { number: 67, name: "Al-Mulk", nameArabic: "الملك", verses: 30 },
  { number: 68, name: "Al-Qalam", nameArabic: "القلم", verses: 52 },
  { number: 69, name: "Al-Haqqah", nameArabic: "الحاقة", verses: 52 },
  { number: 70, name: "Al-Ma'arij", nameArabic: "المعارج", verses: 44 },
  { number: 71, name: "Nuh", nameArabic: "نوح", verses: 28 },
  { number: 72, name: "Al-Jinn", nameArabic: "الجن", verses: 28 },
  { number: 73, name: "Al-Muzzammil", nameArabic: "المزمل", verses: 20 },
  { number: 74, name: "Al-Muddaththir", nameArabic: "المدثر", verses: 56 },
  { number: 75, name: "Al-Qiyamah", nameArabic: "القيامة", verses: 40 },
  { number: 76, name: "Al-Insan", nameArabic: "الانسان", verses: 31 },
  { number: 77, name: "Al-Mursalat", nameArabic: "المرسلات", verses: 50 },
  { number: 78, name: "An-Naba", nameArabic: "النبإ", verses: 40 },
  { number: 79, name: "An-Nazi'at", nameArabic: "النازعات", verses: 46 },
  { number: 80, name: "'Abasa", nameArabic: "عبس", verses: 42 },
  { number: 81, name: "At-Takwir", nameArabic: "التكوير", verses: 29 },
  { number: 82, name: "Al-Infitar", nameArabic: "الإنفطار", verses: 19 },
  { number: 83, name: "Al-Mutaffifin", nameArabic: "المطففين", verses: 36 },
  { number: 84, name: "Al-Inshiqaq", nameArabic: "الإنشقاق", verses: 25 },
  { number: 85, name: "Al-Buruj", nameArabic: "البروج", verses: 22 },
  { number: 86, name: "At-Tariq", nameArabic: "الطارق", verses: 17 },
  { number: 87, name: "Al-A'la", nameArabic: "الأعلى", verses: 19 },
  { number: 88, name: "Al-Ghashiyah", nameArabic: "الغاشية", verses: 26 },
  { number: 89, name: "Al-Fajr", nameArabic: "الفجر", verses: 30 },
  { number: 90, name: "Al-Balad", nameArabic: "البلد", verses: 20 },
  { number: 91, name: "Ash-Shams", nameArabic: "الشمس", verses: 15 },
  { number: 92, name: "Al-Layl", nameArabic: "الليل", verses: 21 },
  { number: 93, name: "Ad-Duhaa", nameArabic: "الضحى", verses: 11 },
  { number: 94, name: "Ash-Sharh", nameArabic: "الشرح", verses: 8 },
  { number: 95, name: "At-Tin", nameArabic: "التين", verses: 8 },
  { number: 96, name: "Al-'Alaq", nameArabic: "العلق", verses: 19 },
  { number: 97, name: "Al-Qadr", nameArabic: "القدر", verses: 5 },
  { number: 98, name: "Al-Bayyinah", nameArabic: "البينة", verses: 8 },
  { number: 99, name: "Az-Zalzalah", nameArabic: "الزلزلة", verses: 8 },
  { number: 100, name: "Al-'Adiyat", nameArabic: "العاديات", verses: 11 },
  { number: 101, name: "Al-Qari'ah", nameArabic: "القارعة", verses: 11 },
  { number: 102, name: "At-Takathur", nameArabic: "التكاثر", verses: 8 },
  { number: 103, name: "Al-'Asr", nameArabic: "العصر", verses: 3 },
  { number: 104, name: "Al-Humazah", nameArabic: "الهمزة", verses: 9 },
  { number: 105, name: "Al-Fil", nameArabic: "الفيل", verses: 5 },
  { number: 106, name: "Quraysh", nameArabic: "قريش", verses: 4 },
  { number: 107, name: "Al-Ma'un", nameArabic: "الماعون", verses: 7 },
  { number: 108, name: "Al-Kawthar", nameArabic: "الكوثر", verses: 3 },
  { number: 109, name: "Al-Kafirun", nameArabic: "الكافرون", verses: 6 },
  { number: 110, name: "An-Nasr", nameArabic: "النصر", verses: 3 },
  { number: 111, name: "Al-Masad", nameArabic: "المسد", verses: 5 },
  { number: 112, name: "Al-Ikhlas", nameArabic: "الإخلاص", verses: 4 },
  { number: 113, name: "Al-Falaq", nameArabic: "الفلق", verses: 5 },
  { number: 114, name: "An-Nas", nameArabic: "الناس", verses: 6 },
];

export function getSurah(number: number): Surah | undefined {
  return SURAHS.find((s) => s.number === number);
}

// Start of each juz as [surah, ayah]. Juz n runs from JUZ_STARTS[n-1] up to
// the ayah before JUZ_STARTS[n] (juz 30 ends at 114:6).
export const JUZ_STARTS: [number, number][] = [
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24], [4, 148], [5, 82], [6, 111],
  [7, 88], [8, 41], [9, 93], [11, 6], [12, 53], [15, 1], [17, 1], [18, 75],
  [21, 1], [23, 1], [25, 21], [27, 56], [29, 46], [33, 31], [36, 28], [39, 32],
  [41, 47], [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
];

export interface AyahRange {
  surah: number;
  startAyah: number;
  endSurah: number;
  endAyah: number;
}

/** Inclusive ayah range covered by juz `from` through juz `to` (1–30). */
export function juzRange(from: number, to: number): AyahRange {
  const a = Math.min(Math.max(from, 1), 30);
  const b = Math.min(Math.max(to, a), 30);
  const [surah, startAyah] = JUZ_STARTS[a - 1];
  if (b === 30) return { surah, startAyah, endSurah: 114, endAyah: 6 };
  const [ns, na] = JUZ_STARTS[b];
  if (na === 1) {
    const prev = getSurah(ns - 1)!;
    return { surah, startAyah, endSurah: ns - 1, endAyah: prev.verses };
  }
  return { surah, startAyah, endSurah: ns, endAyah: na - 1 };
}

/** Human label like "Al-Baqarah 2:30–35" or "Al-Mulk 67:1 – An-Nas 114:6". */
export function rangeLabel(r: AyahRange): string {
  const s = getSurah(r.surah);
  const e = getSurah(r.endSurah);
  if (r.surah === r.endSurah) return `${s?.name} ${r.surah}:${r.startAyah}–${r.endAyah}`;
  return `${s?.name} ${r.surah}:${r.startAyah} – ${e?.name} ${r.endSurah}:${r.endAyah}`;
}
