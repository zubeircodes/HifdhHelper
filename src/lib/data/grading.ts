import type { SupabaseClient } from "@supabase/supabase-js";
import type { Attendance, EvalResult } from "@/lib/grade";
import { SELECT_ASSIGNMENT_GRADED } from "./selects";
import type { AssignmentRow } from "./types";

/**
 * The latest assignment for a slot, whatever its date.
 *
 * Deliberately NOT filtered to `date = today`. The old evaluate pages were, so
 * a lesson set at the last class could never be graded at this one — which is
 * exactly the moment a hifdh teacher grades it.
 */
export async function getGradableAssignment(
  client: SupabaseClient,
  slotId: string
): Promise<AssignmentRow | null> {
  const { data } = await client
    .from("assignments")
    .select(SELECT_ASSIGNMENT_GRADED)
    .eq("student_slot_id", slotId)
    .order("date", { ascending: false })
    .limit(1);
  const rows = (data as unknown as AssignmentRow[] | null) ?? [];
  return rows[0] ?? null;
}

/**
 * `evaluations.assignment_item_id` is UNIQUE, so this upsert is also how a
 * grade is corrected. `result` is typed `EvalResult`, which is what stops the
 * old "fail" value — rejected by the database check constraint — reaching here.
 */
export async function gradeItem(
  client: SupabaseClient,
  opts: { itemId: string; result: EvalResult; note?: string | null; userId: string }
) {
  return client.from("evaluations").upsert(
    {
      assignment_item_id: opts.itemId,
      result: opts.result,
      note: opts.note?.trim() ? opts.note.trim() : null,
      evaluated_by: opts.userId,
      evaluated_at: new Date().toISOString(),
    },
    { onConflict: "assignment_item_id" }
  );
}

export async function clearGrade(client: SupabaseClient, itemId: string) {
  return client.from("evaluations").delete().eq("assignment_item_id", itemId);
}

export async function setAttendance(
  client: SupabaseClient,
  assignmentId: string,
  attendance: Attendance | null
) {
  return client.from("assignments").update({ attendance }).eq("id", assignmentId);
}
