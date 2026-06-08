// Sample data for prototype screens.
// Real verses from Al-Fatihah with tajweed tags.
// Students, assignments, evaluations, notes for instructor/student/parent views.

import type { Token } from "@/components/atoms";

export interface Verse {
  n: number;
  tokens: Token[];
}

export const fatihah: Verse[] = [
  {
    n: 1,
    tokens: [
      { a: "بِسْمِ" },
      { a: "ٱللَّهِ" },
      { a: "ٱلرَّحْمَٰنِ", t: "madda-2" },
      { a: "ٱلرَّحِيمِ", t: "madda-2" },
    ],
  },
  {
    n: 2,
    tokens: [
      { a: "ٱلْحَمْدُ" },
      { a: "لِلَّهِ" },
      { a: "رَبِّ" },
      { a: "ٱلْعَٰلَمِينَ", t: "madda-2" },
    ],
  },
  {
    n: 3,
    tokens: [
      { a: "ٱلرَّحْمَٰنِ", t: "madda-2" },
      { a: "ٱلرَّحِيمِ", t: "madda-2" },
    ],
  },
  {
    n: 4,
    tokens: [
      { a: "مَٰلِكِ", t: "madda-2" },
      { a: "يَوْمِ" },
      { a: "ٱلدِّينِ", t: "madda-2" },
    ],
  },
  {
    n: 5,
    tokens: [
      { a: "إِيَّاكَ", t: "ghunnah" },
      { a: "نَعْبُدُ" },
      { a: "وَإِيَّاكَ", t: "ghunnah" },
      { a: "نَسْتَعِينُ", t: "madda-2" },
    ],
  },
  {
    n: 6,
    tokens: [
      { a: "ٱهْدِنَا" },
      { a: "ٱلصِّرَٰطَ", t: "madda-4" },
      { a: "ٱلْمُسْتَقِيمَ", t: "madda-2" },
    ],
  },
  {
    n: 7,
    tokens: [
      { a: "صِرَٰطَ", t: "madda-2" },
      { a: "ٱلَّذِينَ", t: "madda-2" },
      { a: "أَنْعَمْتَ", t: "ikhfa" },
      { a: "عَلَيْهِمْ" },
      { a: "غَيْرِ" },
      { a: "ٱلْمَغْضُوبِ", t: "qalqalah" },
      { a: "عَلَيْهِمْ" },
      { a: "وَلَا" },
      { a: "ٱلضَّآلِّينَ", t: "madda-6" },
    ],
  },
];

// ── Students ──

export interface Student {
  id: string;
  name: string;
  grade: string;
  initials: string;
  streak: number;
  lastResult: "pass" | "partial" | "fail" | null;
  spark: number[];
  status: "due-today" | "submitted" | "needs-review" | "overdue" | "in-progress";
  currentSurah: string;
}

export const students: Student[] = [
  { id: "s1", name: "Aisha Rahman", grade: "Grade 6", initials: "AR", streak: 12, lastResult: "partial", spark: [3,4,3,5,4,4,5,5,4,5,5,5,4,5], status: "due-today", currentSurah: "Al-Baqarah 2:30–35" },
  { id: "s2", name: "Yusuf Khan", grade: "Grade 7", initials: "YK", streak: 23, lastResult: "pass", spark: [4,5,5,4,5,5,5,5,5,4,5,5,5,5], status: "submitted", currentSurah: "Yā-Sīn 36:1–12" },
  { id: "s3", name: "Maryam Siddiqui", grade: "Grade 5", initials: "MS", streak: 4, lastResult: "fail", spark: [3,3,4,3,3,4,2,3,4,3,3,4,3,4], status: "needs-review", currentSurah: "Al-Mulk 67:1–5" },
  { id: "s4", name: "Ibrahim Hossain", grade: "Grade 8", initials: "IH", streak: 0, lastResult: null, spark: [4,4,5,4,3,0,0,0,3,4,4,4,5,4], status: "overdue", currentSurah: "Ar-Raḥmān 55:1–13" },
  { id: "s5", name: "Fatima Al-Hassani", grade: "Grade 6", initials: "FA", streak: 18, lastResult: "pass", spark: [4,5,4,5,5,4,5,5,4,5,4,5,5,5], status: "due-today", currentSurah: "An-Nabaʾ 78:1–10" },
  { id: "s6", name: "Omar Farooq", grade: "Grade 7", initials: "OF", streak: 7, lastResult: "pass", spark: [4,4,4,5,4,4,5,4,4,5,4,4,4,5], status: "in-progress", currentSurah: "Aḍ-Ḍuḥā 93:1–11" },
  { id: "s7", name: "Khadija Bilal", grade: "Grade 5", initials: "KB", streak: 11, lastResult: "partial", spark: [3,4,4,4,5,4,4,3,4,4,5,4,4,4], status: "in-progress", currentSurah: "Al-Ikhlāṣ 112:1–4" },
  { id: "s8", name: "Hamza Patel", grade: "Grade 8", initials: "HP", streak: 31, lastResult: "pass", spark: [5,5,5,5,4,5,5,5,5,5,5,5,5,5], status: "submitted", currentSurah: "Āl ʿImrān 3:1–10" },
];

// ── Lesson categories ──

export interface LessonCategory {
  id: string;
  name: string;
  desc: string;
}

export const categories: LessonCategory[] = [
  { id: "c-new", name: "New Lesson", desc: "New verses to memorize" },
  { id: "c-review", name: "Review", desc: "Recent revision" },
  { id: "c-group", name: "Group Review", desc: "Revised together in halaqah" },
];

// ── Assignments ──

export interface AssignmentLesson {
  surah: string;
  range: string;
  reciter: string;
  repeat: number;
}

export interface Evaluation {
  date: string;
  sabaq: "pass" | "partial" | "fail";
  sabqi: "pass" | "partial" | "fail" | null;
  manzil: "pass" | "partial" | "fail";
  note: string;
  mistakes: number;
  by: string;
}

export interface Assignment {
  id: string;
  student: string;
  due: string;
  sabaq: AssignmentLesson;
  sabqi: AssignmentLesson | null;
  manzil: AssignmentLesson;
  practice: { sessions: number; minutes: number };
  evaluations: Evaluation[];
}

export const assignments: Assignment[] = [
  {
    id: "a1", student: "s1", due: "Today",
    sabaq: { surah: "Al-Baqarah", range: "2:30–35", reciter: "Alafasy", repeat: 5 },
    sabqi: { surah: "Al-Baqarah", range: "2:21–29", reciter: "Alafasy", repeat: 3 },
    manzil: { surah: "Al-Fātiḥah", range: "1:1–7", reciter: "Alafasy", repeat: 2 },
    practice: { sessions: 3, minutes: 22 },
    evaluations: [
      { date: "Apr 26", sabaq: "fail", sabqi: "partial", manzil: "pass", note: "Strong on ayah 1–3, tajweed needs work on ayah 4. Slow down on the madd in ٱلرَّحْمَٰنِ.", mistakes: 6, by: "Ustadh Yusuf" },
      { date: "Apr 27", sabaq: "partial", sabqi: "pass", manzil: "pass", note: "Better — ayah 4 is clean now. One ghunnah needs more nasalization.", mistakes: 2, by: "Ustadh Yusuf" },
    ],
  },
];

// ── Notes ──

export interface Note {
  id: string;
  from: "parent" | "instructor";
  author: string;
  time: string;
  text: string;
}

export const notes: Note[] = [
  { id: "n1", from: "parent", author: "Sr. Aaliyah (mom)", time: "2d ago", text: "Aisha was unwell yesterday — please excuse the partial last session. We'll make it up tonight inshaAllah." },
  { id: "n2", from: "instructor", author: "Ustadh Yusuf", time: "1d ago", text: "JazakAllah khayr for letting me know. She did very well today — back on track." },
  { id: "n3", from: "parent", author: "Sr. Aaliyah (mom)", time: "3h ago", text: "Alhamdulillah. Should we continue with 5 ayahs/day or slow down a bit this week?" },
];

// ── Reciters ──

export const reciters = [
  { id: "Alafasy_64kbps", name: "Mishary Alafasy" },
  { id: "Husary_64kbps", name: "Mahmoud Al-Hussary" },
  { id: "Minshawy_Murattal_128kbps", name: "Mohamed Al-Minshawy" },
];

// ── Surahs (sample) ──

export const surahs = [
  { n: 1, name: "Al-Fātiḥah", ayat: 7 },
  { n: 2, name: "Al-Baqarah", ayat: 286 },
  { n: 3, name: "Āl ʿImrān", ayat: 200 },
  { n: 36, name: "Yā-Sīn", ayat: 83 },
  { n: 55, name: "Ar-Raḥmān", ayat: 78 },
  { n: 67, name: "Al-Mulk", ayat: 30 },
  { n: 78, name: "An-Nabaʾ", ayat: 40 },
  { n: 93, name: "Aḍ-Ḍuḥā", ayat: 11 },
  { n: 94, name: "Ash-Sharḥ", ayat: 8 },
  { n: 112, name: "Al-Ikhlāṣ", ayat: 4 },
];
