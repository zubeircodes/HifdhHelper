// Verses for the /recite presets, lifted verbatim from
// public/text/qpc-hafs-tajweed.json so the tokenizer sees real <rule> markup.
//
// The harness needs a handful of ayat, and the full corpus is 3.8 MB. Fetching
// that to recite eight words made the page hang on a phone and on any tunnel.
// Generated, do not hand-edit: re-run scripts/gen-recitation-samples.mjs.

import type { Verse } from "./recitation";

const SAMPLE_TEXT: Record<string, string> = {
  "1:1": "بِسۡمِ <rule class=ham_wasl>ٱ</rule>للَّهِ <rule class=ham_wasl>ٱ</rule><rule class=laam_shamsiyah>ل</rule>رَّحۡمَ<rule class=madda_normal>ـٰ</rule>نِ <rule class=ham_wasl>ٱ</rule><rule class=laam_shamsiyah>ل</rule>رَّح<rule class=madda_permissible>ِي</rule>مِ ١",
  "1:2": "ٱلۡحَمۡدُ لِلَّهِ رَبِّ <rule class=ham_wasl>ٱ</rule>لۡعَ<rule class=madda_normal>ـٰ</rule>لَم<rule class=madda_permissible>ِي</rule>نَ ٢",
  "1:3": "ٱ<rule class=laam_shamsiyah>ل</rule>رَّحۡمَ<rule class=madda_normal>ـٰ</rule>نِ <rule class=ham_wasl>ٱ</rule><rule class=laam_shamsiyah>ل</rule>رَّح<rule class=madda_permissible>ِي</rule>مِ ٣",
  "1:4": "مَ<rule class=madda_normal>ـٰ</rule>لِكِ يَوۡمِ <rule class=ham_wasl>ٱ</rule><rule class=laam_shamsiyah>ل</rule>دّ<rule class=madda_permissible>ِي</rule>نِ ٤",
  "1:5": "إِيَّاكَ نَعۡبُدُ وَإِيَّاكَ نَسۡتَع<rule class=madda_permissible>ِي</rule>نُ ٥",
  "1:6": "ٱهۡدِنَا <rule class='ham_wasl'>ٱ</rule><rule class='laam_shamsiyah'>ل</rule>صِّر<rule class='madda_normal'>ٰ</rule>طَ <rule class=ham_wasl>ٱ</rule>لۡمُسۡتَق<rule class=madda_permissible>ِي</rule>مَ ٦",
  "1:7": "صِر<rule class='madda_normal'>ٰ</rule>طَ <rule class=ham_wasl>ٱ</rule>لَّذِينَ أَنۡعَمۡتَ عَلَيۡهِمۡ غَيۡرِ <rule class=ham_wasl>ٱ</rule>لۡمَغۡضُوبِ عَلَيۡهِمۡ وَلَا <rule class=ham_wasl>ٱ</rule><rule class=laam_shamsiyah>ل</rule>ضّ<rule class=madda_necessary>َا</rule>ٓلّ<rule class=madda_permissible>ِي</rule>نَ ٧",
  "112:1": "قُلۡ هُوَ <rule class=ham_wasl>ٱ</rule>للَّهُ أَحَ<rule class=qalaqah>د</rule>ٌ ١",
  "112:2": "ٱللَّهُ <rule class=ham_wasl>ٱ</rule><rule class=laam_shamsiyah>ل</rule>صَّمَ<rule class=qalaqah>د</rule>ُ ٢",
  "112:3": "لَمۡ يَلِ<rule class=qalaqah>دۡ</rule> وَلَمۡ يُولَ<rule class=qalaqah>دۡ</rule> ٣",
  "112:4": "وَلَمۡ يَك<rule class=idgham_wo_ghunnah>ُن</rule> <rule class=idgham_wo_ghunnah>ل</rule>َّهُ<rule class=madda_normal>ۥ</rule> كُفُوًا أَحَ<rule class=qalaqah>د</rule>ُۢ ٤",
  "114:1": "قُلۡ أَعُوذُ بِرَبِّ <rule class=ham_wasl>ٱ</rule><rule class=laam_shamsiyah>ل</rule><rule class=ghunnah>نّ</rule><rule class=madda_permissible>َا</rule>سِ ١",
  "114:2": "مَلِكِ <rule class=ham_wasl>ٱ</rule><rule class=laam_shamsiyah>ل</rule><rule class=ghunnah>نّ</rule><rule class=madda_permissible>َا</rule>سِ ٢",
  "114:3": "إِلَ<rule class=madda_normal>ـٰ</rule>هِ <rule class=ham_wasl>ٱ</rule><rule class=laam_shamsiyah>ل</rule><rule class=ghunnah>نّ</rule><rule class=madda_permissible>َا</rule>سِ ٣",
  "114:4": "مِ<rule class=ikhafa>ن</rule> <rule class=ikhafa>ش</rule>َرِّ <rule class=ham_wasl>ٱ</rule>لۡوَسۡوَاسِ <rule class=ham_wasl>ٱ</rule>لۡخَ<rule class=ghunnah>نّ</rule><rule class=madda_permissible>َا</rule>سِ ٤",
  "114:5": "ٱلَّذِى يُوَسۡوِسُ فِى صُدُورِ <rule class=ham_wasl>ٱ</rule><rule class=laam_shamsiyah>ل</rule><rule class=ghunnah>نّ</rule><rule class=madda_permissible>َا</rule>سِ ٥",
  "114:6": "مِنَ <rule class=ham_wasl>ٱ</rule>لۡجِ<rule class=ghunnah>نّ</rule>َةِ وَ<rule class=ham_wasl>ٱ</rule><rule class=laam_shamsiyah>ل</rule><rule class=ghunnah>نّ</rule><rule class=madda_permissible>َا</rule>سِ ٦",
  "2:1": "ا<rule class=madda_necessary>لٓ</rule><rule class=madda_necessary>مٓ</rule> ١",
  "2:2": "ذ<rule class='madda_normal'>ٰ</rule>لِكَ <rule class=ham_wasl>ٱ</rule>لۡكِتَ<rule class=madda_normal>ـٰ</rule>بُ لَا رَيۡبَ‌ۛ فِيهِ‌ۛ هُ<rule class=idgham_wo_ghunnah>دًى</rule> <rule class=idgham_wo_ghunnah>ل</rule>ِّلۡمُتَّق<rule class=madda_permissible>ِي</rule>نَ ٢",
  "2:3": "ٱلَّذِينَ يُؤۡمِنُونَ بِ<rule class=ham_wasl>ٱ</rule>لۡغَيۡبِ وَيُقِيمُونَ <rule class=ham_wasl>ٱ</rule><rule class=laam_shamsiyah>ل</rule>صَّلَ<rule class=slnt>و</rule><rule class=madda_normal>ٰ</rule>ةَ وَمِ<rule class=ghunnah>مّ</rule>َا رَزَ<rule class=qalaqah>قۡ</rule>نَ<rule class=madda_normal>ـٰ</rule>هُمۡ يُ<rule class=ikhafa>نف</rule>ِق<rule class=madda_permissible>ُو</rule>نَ ٣",
  "2:4": "وَ<rule class=ham_wasl>ٱ</rule>لَّذِينَ يُؤۡمِنُونَ بِم<rule class=madda_obligatory_monfasel>َآ</rule> أُ<rule class=ikhafa>نز</rule>ِلَ إِلَيۡكَ وَم<rule class=madda_obligatory_monfasel>َآ</rule> أُ<rule class=ikhafa>نز</rule>ِلَ مِ<rule class=ikhafa>ن</rule> <rule class=ikhafa>ق</rule>َ<rule class=qalaqah>بۡ</rule>لِكَ وَبِ<rule class=ham_wasl>ٱ</rule>لۡأَخِرَةِ هُمۡ يُوقِن<rule class=madda_permissible>ُو</rule>نَ ٤",
  "2:5": "أُ<rule class=slnt>وۡ</rule>لَ<rule class=madda_obligatory_mottasel>ـٰٓ</rule>ئِكَ عَلَىٰ هُ<rule class=idgham_ghunnah>دًى</rule> <rule class=idgham_ghunnah>م</rule>ّ<rule class=idgham_wo_ghunnah>ِن</rule> <rule class=idgham_wo_ghunnah>ر</rule>َّبِّهِمۡ‌ۖ وَأُ<rule class=slnt>وۡ</rule>لَ<rule class=madda_obligatory_mottasel>ـٰٓ</rule>ئِكَ هُمُ <rule class=ham_wasl>ٱ</rule>لۡمُفۡلِح<rule class=madda_permissible>ُو</rule>نَ ٥",
};

/** Verses for a range, or null when the range is not bundled. */
export function getSampleRange(
  surah: number,
  from: number,
  to: number,
): Verse[] | null {
  const out: Verse[] = [];
  for (let v = from; v <= to; v++) {
    const text = SAMPLE_TEXT[`${surah}:${v}`];
    if (text === undefined) return null;
    out.push({ surah, verse: v, text });
  }
  return out.length ? out : null;
}
