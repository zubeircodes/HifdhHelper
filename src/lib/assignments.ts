// Shared queries and types for a student slot's assignments, items and
// evaluations. Used by the instructor evaluate, student detail and roster
// pages so they all read the same shape.

import type { SupabaseClient } from "@supabase/supabase-js";
import { rangeLabel } from "./quran-meta";

export type EvalResult = "pass" | "partial" | "redo";

export interface Evaluation {
  result: EvalResult;
  note: string | null;
  evaluated_at: string;
}

export interface AssignmentItem {
  id: string;
  lesson_type_id: string;
  lesson_type_name: string;
  surah: number;
  start_ayah: number;
  end_surah: number;
  end_ayah: number;
  reciter_ref: string | null;
  repetitions: number;
  listens: number;
  last_listened_at: string | null;
  submitted_at: string | null;
  evaluation: Evaluation | null;
}

export interface Assignment {
  id: string;
  date: string;
  items: AssignmentItem[];
}

export const ITEM_FIELDS =
  "id, lesson_type_id, surah, start_ayah, end_surah, end_ayah, reciter_ref, repetitions, lesson_types(name), listen_progress(listens_completed, last_listened_at), submissions(submitted_at), evaluations(result, note, evaluated_at)";

const ITEM_SELECT = `id, date, assignment_items(${ITEM_FIELDS})`;

// PostgREST returns a to-one relation as an object, but some setups return a
// one-element array. Accept either.
function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null;
  return Array.isArray(v) ? (v[0] ?? null) : v;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function normalizeItem(it: any): AssignmentItem {
  const lp = one<{ listens_completed: number; last_listened_at: string | null }>(it.listen_progress);
  return {
    id: it.id,
    lesson_type_id: it.lesson_type_id,
    lesson_type_name: one<{ name: string }>(it.lesson_types)?.name ?? "Lesson",
    surah: it.surah,
    start_ayah: it.start_ayah,
    end_surah: it.end_surah ?? it.surah,
    end_ayah: it.end_ayah,
    reciter_ref: it.reciter_ref,
    repetitions: it.repetitions,
    listens: lp?.listens_completed ?? 0,
    last_listened_at: lp?.last_listened_at ?? null,
    submitted_at: one<{ submitted_at: string }>(it.submissions)?.submitted_at ?? null,
    evaluation: one<Evaluation>(it.evaluations),
  };
}

export function normalizeAssignment(row: any): Assignment {
  const items: AssignmentItem[] = (row.assignment_items || []).map(normalizeItem);
  // Stable order: by surah then ayah, so Review ranges read in mushaf order.
  items.sort((a, b) => a.surah - b.surah || a.start_ayah - b.start_ayah);
  return { id: row.id, date: row.date, items };
}
/* eslint-enable @typescript-eslint/no-explicit-any */

/** Newest-first assignments for a slot, with items and their evaluation. */
export async function loadSlotAssignments(
  supabase: SupabaseClient,
  slotId: string,
  limit = 50,
): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from("assignments")
    .select(ITEM_SELECT)
    .eq("student_slot_id", slotId)
    .order("date", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map(normalizeAssignment);
}

/** Newest-first assignments for the signed-in student (via their claimed slot
 *  or student_id). */
export async function loadMyAssignments(
  supabase: SupabaseClient,
  userId: string,
  limit = 20,
): Promise<Assignment[]> {
  const { data, error } = await supabase
    .from("assignments")
    .select(ITEM_SELECT)
    .or(`student_id.eq.${userId},student_slot_id.in.(${await mySlotIds(supabase, userId)})`)
    .order("date", { ascending: false })
    .limit(limit);
  if (error || !data) return [];
  return data.map(normalizeAssignment);
}

async function mySlotIds(supabase: SupabaseClient, userId: string): Promise<string> {
  const { data } = await supabase.from("student_slots").select("id").eq("claimed_by", userId);
  const ids = (data || []).map((s) => s.id);
  // PostgREST needs a non-empty list; a nil uuid matches nothing.
  return (ids.length ? ids : ["00000000-0000-0000-0000-000000000000"]).join(",");
}

/** The assignment a teacher should be grading: the newest one with an
 *  ungraded item, else the newest one at all. */
export function pickPending(assignments: Assignment[]): Assignment | null {
  return (
    assignments.find((a) => a.items.some((i) => !i.evaluation)) ??
    assignments[0] ??
    null
  );
}

export function itemLabel(it: AssignmentItem): string {
  return rangeLabel({
    surah: it.surah,
    startAyah: it.start_ayah,
    endSurah: it.end_surah,
    endAyah: it.end_ayah,
  });
}

/** Status pill kind for an evaluation result. */
export function statusKind(r: EvalResult | null | undefined): "pass" | "partial" | "fail" | "muted" {
  if (r === "pass") return "pass";
  if (r === "partial") return "partial";
  if (r === "redo") return "fail";
  return "muted";
}

export function resultLabel(r: EvalResult | null | undefined): string {
  if (r === "pass") return "Passed";
  if (r === "partial") return "Partial";
  if (r === "redo") return "Redo";
  return "Pending";
}

export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short", month: "short", day: "numeric",
  });
}
