import type { SupabaseClient } from "@supabase/supabase-js";
import type { LessonType } from "./types";

export async function listLessonTypes(
  client: SupabaseClient,
  instructorId: string
): Promise<LessonType[]> {
  const { data } = await client
    .from("lesson_types")
    .select("id, name, description, sort_order")
    .eq("instructor_id", instructorId)
    .eq("is_active", true)
    .order("sort_order", { ascending: true });
  return (data as LessonType[] | null) ?? [];
}

export async function updateLessonType(
  client: SupabaseClient,
  id: string,
  patch: Partial<Pick<LessonType, "name" | "description" | "sort_order">>
) {
  return client.from("lesson_types").update(patch).eq("id", id);
}

/** Soft delete: history must still render the name on old assignments. */
export async function deactivateLessonType(client: SupabaseClient, id: string) {
  return client.from("lesson_types").update({ is_active: false }).eq("id", id);
}

export async function createLessonType(
  client: SupabaseClient,
  opts: { instructorId: string; name: string; sortOrder: number }
) {
  return client
    .from("lesson_types")
    .insert({
      instructor_id: opts.instructorId,
      name: opts.name,
      description: "",
      sort_order: opts.sortOrder,
    })
    .select()
    .single();
}
