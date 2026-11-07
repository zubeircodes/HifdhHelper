// Replaces the auth.getUser() -> halaqat -> student_slots preamble that was
// hand-rolled in five instructor pages.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Halaqa, LessonType } from "./types";

export interface InstructorContext {
  userId: string;
  halaqat: Halaqa[];
  halaqaIds: string[];
  halaqaNameById: Map<string, string>;
  lessonTypes: LessonType[];
}

/**
 * Returns null when there is no session. Callers must redirect on null rather
 * than returning early — the old pages did `if (!user) return;` and left
 * `loading` true forever, so an expired token showed a permanent "Loading...".
 */
export async function getInstructorContext(
  client: SupabaseClient
): Promise<InstructorContext | null> {
  const {
    data: { user },
  } = await client.auth.getUser();
  if (!user) return null;

  const [{ data: halaqat }, { data: lessonTypes }] = await Promise.all([
    client
      .from("halaqat")
      .select("id, name")
      .eq("instructor_id", user.id)
      .order("created_at", { ascending: true }),
    client
      .from("lesson_types")
      .select("id, name, description, sort_order")
      .eq("instructor_id", user.id)
      .eq("is_active", true)
      .order("sort_order", { ascending: true }),
  ]);

  const list: Halaqa[] = halaqat ?? [];
  return {
    userId: user.id,
    halaqat: list,
    halaqaIds: list.map((h) => h.id),
    halaqaNameById: new Map(list.map((h) => [h.id, h.name])),
    lessonTypes: lessonTypes ?? [],
  };
}
