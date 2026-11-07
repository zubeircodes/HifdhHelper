import type { SupabaseClient } from "@supabase/supabase-js";
import { SELECT_ASSIGNMENT_GRADED } from "./selects";
import type { AssignmentRow } from "./types";

export interface SlotHistory {
  /** The latest assignment — what the teacher grades and assigns from. */
  current: AssignmentRow | null;
  /** Everything before it, newest first. */
  past: AssignmentRow[];
}

/**
 * A student's whole history in ONE query, using the same select constant as the
 * Today queue so the two can never drift. Replaces the four sequential `.in()`
 * calls the old assignments page used.
 */
export async function getSlotHistory(
  client: SupabaseClient,
  slotId: string
): Promise<SlotHistory> {
  const { data } = await client
    .from("assignments")
    .select(SELECT_ASSIGNMENT_GRADED)
    .eq("student_slot_id", slotId)
    .order("date", { ascending: false });

  const rows = (data as unknown as AssignmentRow[] | null) ?? [];
  return { current: rows[0] ?? null, past: rows.slice(1) };
}
