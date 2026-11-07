// Defence for the riskiest assumption in the data layer.
//
// PostgREST should return an embedded to-one relation as an object (both
// `evaluations.assignment_item_id` and `listen_progress.assignment_item_id` are
// `not null unique`), but version behaviour varies. If it ever returns an array
// where the code expects an object, every item reads as ungraded: the Today
// queue shows the whole roster as needing grading and never drains, and no
// summary email ever fires. Every embedded read goes through here.

import type { AssignmentItemRow, EvaluationRow, LessonType } from "./types";

export function one<T>(v: T | T[] | null | undefined): T | null {
  if (v == null) return null;
  if (Array.isArray(v)) return v.length > 0 ? v[0] : null;
  return v;
}

export function evalOf(item: AssignmentItemRow): EvaluationRow | null {
  return one(item.evaluations);
}

export function lessonTypeOf(item: AssignmentItemRow): LessonType | null {
  // Soft-deleted categories still embed, which is what history needs: a
  // category removed last month must still render its name on old assignments.
  // A null here means RLS filtered it (another instructor's category).
  return one(item.lesson_types);
}

export function lessonTypeName(item: AssignmentItemRow): string {
  return lessonTypeOf(item)?.name ?? "Unknown lesson";
}

export function isGraded(item: AssignmentItemRow): boolean {
  return evalOf(item) !== null;
}
