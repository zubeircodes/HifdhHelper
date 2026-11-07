import type { SupabaseClient } from "@supabase/supabase-js";
import { getSurah } from "@/lib/quran-meta";
import { SELECT_SLOT } from "./selects";
import type { StudentSlot } from "./types";

export async function listSlots(
  client: SupabaseClient,
  halaqaIds: string[]
): Promise<StudentSlot[]> {
  if (halaqaIds.length === 0) return [];
  const { data } = await client
    .from("student_slots")
    .select(SELECT_SLOT)
    .in("halaqa_id", halaqaIds)
    .order("student_name", { ascending: true });
  return (data as StudentSlot[] | null) ?? [];
}

export async function getSlot(
  client: SupabaseClient,
  slotId: string
): Promise<StudentSlot | null> {
  const { data } = await client
    .from("student_slots")
    .select(SELECT_SLOT)
    .eq("id", slotId)
    .single();
  return (data as StudentSlot | null) ?? null;
}

export async function createHalaqa(
  client: SupabaseClient,
  opts: { name: string; instructorId: string }
) {
  return client
    .from("halaqat")
    .insert({ name: opts.name, instructor_id: opts.instructorId })
    .select()
    .single();
}

export async function createSlot(
  client: SupabaseClient,
  opts: { halaqaId: string; studentName: string; surah: number; verse: string }
) {
  return client.rpc("create_student_slot", {
    halaqa_uuid: opts.halaqaId,
    student_name_param: opts.studentName,
    current_surah_param: formatCurrentSurah(opts.surah),
    current_verse_param: opts.verse,
  });
}

/**
 * The ONLY writer of the denormalised `current_surah` / `current_verse` free
 * text. Formats are preserved exactly as the existing pages wrote them
 * ("Al-Baqarah (2)" and "30-35" with an en dash) because four display sites
 * render them raw. Nothing should ever parse these back out — read the
 * structured `assignment_items` instead.
 */
export async function setSlotCurrentLesson(
  client: SupabaseClient,
  slotId: string,
  lesson: { surah: number; start_ayah: number; end_ayah: number }
) {
  return client
    .from("student_slots")
    .update({
      current_surah: formatCurrentSurah(lesson.surah),
      current_verse:
        lesson.start_ayah === lesson.end_ayah
          ? String(lesson.start_ayah)
          : `${lesson.start_ayah}–${lesson.end_ayah}`,
      updated_at: new Date().toISOString(),
    })
    .eq("id", slotId);
}

function formatCurrentSurah(num: number): string {
  const s = getSurah(num);
  return s ? `${s.name} (${num})` : `Surah ${num}`;
}
