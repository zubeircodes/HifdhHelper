// "Top of the stack": what a student must prepare next, per lesson category.
//
// A hifdh student carries sabaq, sabqi and manzil at once, so this resolves per
// category rather than globally. PURE on purpose — it is shared by the summary
// email, the /l/<token> lesson page, and the workbench's assign prefill, so
// what the family is told, what the link opens, and what the teacher sees can
// never disagree. The repo has no tests; keeping this DB-free makes it testable.

import type { Attendance } from "@/lib/grade";
import { evalOf, lessonTypeName } from "@/lib/data/normalize";
import type { AssignmentItemRow, AssignmentRow } from "@/lib/data/types";

export type NextAction = "advance" | "repeat" | "not-assessed";

export interface NextLessonEntry {
  lessonTypeId: string;
  lessonTypeName: string;
  /** The item the student was given this session. */
  item: AssignmentItemRow;
  /** What happened to it. */
  outcome: "pass" | "partial" | "redo" | "absent" | "excused" | "ungraded";
  /** What they do about it next class. */
  action: NextAction;
}

/**
 * `advance` means this category is cleared and the teacher should set the next
 * portion. `repeat` means the same item comes back. `not-assessed` means class
 * ended without a judgement — the item also comes back, but the family is told
 * it was not heard rather than that it was failed.
 */
export function resolveNextLesson(assignment: AssignmentRow | null): NextLessonEntry[] {
  if (!assignment) return [];

  const attendance = assignment.attendance as Attendance | null;

  return [...assignment.assignment_items]
    .sort(sortByLessonOrder)
    .map((item) => {
      if (attendance === "absent" || attendance === "excused") {
        return entry(item, attendance, "repeat");
      }
      const ev = evalOf(item);
      if (!ev) return entry(item, "ungraded", "not-assessed");
      if (ev.result === "pass") return entry(item, "pass", "advance");
      return entry(item, ev.result, "repeat");
    });
}

/** The ayah range to prefill when assigning this category's next lesson. */
export function prefillForNext(e: NextLessonEntry): {
  surah: number;
  startAyah: number;
  endAyah: number;
} {
  if (e.action === "advance") {
    // Continue from where they finished. Clamped by validateRange at the form.
    return {
      surah: e.item.surah,
      startAyah: e.item.end_ayah + 1,
      endAyah: e.item.end_ayah + 1,
    };
  }
  return {
    surah: e.item.surah,
    startAyah: e.item.start_ayah,
    endAyah: e.item.end_ayah,
  };
}

function entry(
  item: AssignmentItemRow,
  outcome: NextLessonEntry["outcome"],
  action: NextAction
): NextLessonEntry {
  return {
    lessonTypeId: item.lesson_type_id,
    lessonTypeName: lessonTypeName(item),
    item,
    outcome,
    action,
  };
}

function sortByLessonOrder(a: AssignmentItemRow, b: AssignmentItemRow): number {
  // Ordering a parent row by a doubly-nested embedded column is awkward and
  // version-sensitive in PostgREST, so sort here instead.
  //
  // sort_order is not unique per instructor — live data has two active
  // categories both at 1 — so tiebreak by name to keep the order stable
  // between renders and between the email and the screen.
  const delta = oneSort(a) - oneSort(b);
  if (delta !== 0) return delta;
  return lessonTypeName(a).localeCompare(lessonTypeName(b));
}

function oneSort(item: AssignmentItemRow): number {
  const lt = Array.isArray(item.lesson_types) ? item.lesson_types[0] : item.lesson_types;
  return lt?.sort_order ?? Number.MAX_SAFE_INTEGER;
}
