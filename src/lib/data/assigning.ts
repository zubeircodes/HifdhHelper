import type { SupabaseClient } from "@supabase/supabase-js";
import { todayISO } from "@/lib/format";
import { setSlotCurrentLesson } from "./roster";

export interface AssignTargetSlot {
  id: string;
  halaqaId: string;
  claimedBy: string | null;
}

export interface AssignLessonInput {
  slots: AssignTargetSlot[];
  lessonTypeId: string;
  surah: number;
  startAyah: number;
  endAyah: number;
  reciter: string | null;
  repetitions: number;
  userId: string;
  date?: string;
}

/**
 * One path for both inline assign (one slot) and bulk assign (many).
 *
 * Per slot: find-or-create the assignment for `date` (an `assignments_slot_date`
 * unique index enforces one per student per day), then upsert the item.
 *
 * The item upsert relies on a unique index on (assignment_id, lesson_type_id)
 * added in the Phase 2b migration. That index MUST exist in the database before
 * this code runs, or Postgres raises 42P10.
 */
export async function assignLesson(
  client: SupabaseClient,
  input: AssignLessonInput
): Promise<{ created: number; errors: string[] }> {
  const date = input.date ?? todayISO();
  const errors: string[] = [];
  let created = 0;

  for (const slot of input.slots) {
    const { data: existing } = await client
      .from("assignments")
      .select("id")
      .eq("student_slot_id", slot.id)
      .eq("date", date)
      .limit(1);

    let assignmentId = existing?.[0]?.id as string | undefined;

    if (!assignmentId) {
      const { data: inserted, error } = await client
        .from("assignments")
        .insert({
          student_slot_id: slot.id,
          halaqa_id: slot.halaqaId,
          date,
          created_by: input.userId,
          // Only set when the slot is claimed; student-side RLS matches on it.
          ...(slot.claimedBy ? { student_id: slot.claimedBy } : {}),
        })
        .select("id")
        .single();

      if (error || !inserted) {
        errors.push(`${slot.id}: ${error?.message ?? "could not create assignment"}`);
        continue;
      }
      assignmentId = inserted.id as string;
    }

    const { error: itemError } = await client.from("assignment_items").upsert(
      {
        assignment_id: assignmentId,
        lesson_type_id: input.lessonTypeId,
        surah: input.surah,
        start_ayah: input.startAyah,
        end_ayah: input.endAyah,
        reciter_ref: input.reciter,
        repetitions: input.repetitions,
      },
      { onConflict: "assignment_id,lesson_type_id" }
    );

    if (itemError) {
      errors.push(`${slot.id}: ${itemError.message}`);
      continue;
    }

    await setSlotCurrentLesson(client, slot.id, {
      surah: input.surah,
      start_ayah: input.startAyah,
      end_ayah: input.endAyah,
    });
    created += 1;
  }

  return { created, errors };
}
