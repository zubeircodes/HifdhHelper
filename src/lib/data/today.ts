import type { SupabaseClient } from "@supabase/supabase-js";
import { shiftISODays, todayISO } from "@/lib/format";
import { isExcusedFromGrading } from "@/lib/grade";
import type { InstructorContext } from "./instructor-context";
import { evalOf } from "./normalize";
import { listSlots } from "./roster";
import { SELECT_ASSIGNMENT_GRADED } from "./selects";
import type { AssignmentRow, StudentSlot } from "./types";

/** How far back to look. Bounded so the query stays flat as history grows. */
export const TODAY_WINDOW_DAYS = 120;

export interface OutstandingAssignment {
  assignmentId: string;
  date: string;
  ungradedCount: number;
}

export interface QueueEntry {
  slot: StudentSlot;
  oldestOutstanding: string;
  ungradedCount: number;
  overdue: boolean;
}

export interface TodayQueue {
  needsGrading: QueueEntry[];
  needsLesson: StudentSlot[];
  doneToday: number;
  totalStudents: number;
}

/**
 * Two flat queries, fixed count regardless of roster size. This replaces three
 * queries PER STUDENT on the old roster page (8 students = 27 round trips).
 *
 * The roster query is not folded into the assignments query: a student with no
 * assignments at all cannot appear there, and that is exactly the "needs a
 * lesson" case. `student_slot_id` is also nullable, which would force a `!left`
 * embed for no gain.
 */
export async function getTodayQueue(
  client: SupabaseClient,
  ctx: InstructorContext,
  today: string = todayISO()
): Promise<TodayQueue> {
  if (ctx.halaqaIds.length === 0) {
    return { needsGrading: [], needsLesson: [], doneToday: 0, totalStudents: 0 };
  }

  const [slots, { data: assignments }] = await Promise.all([
    listSlots(client, ctx.halaqaIds),
    client
      .from("assignments")
      .select(SELECT_ASSIGNMENT_GRADED)
      .in("halaqa_id", ctx.halaqaIds)
      .gte("date", shiftISODays(today, -TODAY_WINDOW_DAYS))
      .lte("date", today)
      .order("date", { ascending: true }),
  ]);

  return deriveTodayQueue(
    slots,
    (assignments as unknown as AssignmentRow[] | null) ?? [],
    today
  );
}

/**
 * PURE. The one piece of non-obvious logic in the refactor, kept free of the
 * database so it can be tested without one.
 *
 * An assignment is OUTSTANDING when at least one of its items has no
 * evaluation and the student was not marked absent or excused. "Due next class"
 * is derived this way rather than from a due-date column, which does not exist.
 */
export function deriveTodayQueue(
  slots: StudentSlot[],
  assignments: AssignmentRow[],
  today: string
): TodayQueue {
  const outstandingBySlot = new Map<string, OutstandingAssignment[]>();
  const latestDateBySlot = new Map<string, string>();
  // Distinct assignment dates per halaqa stand in for "sessions": there is no
  // schedule column, so a session can only mean a day this class was assigned
  // anything. Under-reports overdue if the window is short; never over-reports.
  const sessionDatesByHalaqa = new Map<string, Set<string>>();

  for (const a of assignments) {
    if (!a.student_slot_id) continue;

    if (!sessionDatesByHalaqa.has(a.halaqa_id)) {
      sessionDatesByHalaqa.set(a.halaqa_id, new Set());
    }
    sessionDatesByHalaqa.get(a.halaqa_id)!.add(a.date);

    const prev = latestDateBySlot.get(a.student_slot_id);
    if (!prev || prev < a.date) latestDateBySlot.set(a.student_slot_id, a.date);

    // Absence excuses a student ON THE DAY — they are not expected in a queue
    // for a class they missed. It does NOT clear the lesson: the portion still
    // was not recited, so from the next class onward it is outstanding again
    // and they recite it then. Clearing it here would make the teacher assign
    // something new and silently skip the missed portion.
    if (isExcusedFromGrading(a.attendance) && a.date === today) continue;

    const ungraded = a.assignment_items.filter((it) => evalOf(it) === null);
    if (ungraded.length === 0) continue;

    if (!outstandingBySlot.has(a.student_slot_id)) {
      outstandingBySlot.set(a.student_slot_id, []);
    }
    outstandingBySlot.get(a.student_slot_id)!.push({
      assignmentId: a.id,
      date: a.date,
      ungradedCount: ungraded.length,
    });
  }

  const sortedSessions = new Map<string, string[]>();
  for (const [halaqaId, dates] of sessionDatesByHalaqa) {
    sortedSessions.set(halaqaId, [...dates].sort());
  }

  const needsGrading: QueueEntry[] = [];
  const needsLesson: StudentSlot[] = [];

  for (const slot of slots) {
    const outstanding = outstandingBySlot.get(slot.id);

    if (outstanding && outstanding.length > 0) {
      // ISO dates sort lexically, so string comparison is correct here.
      const oldest = outstanding.reduce((a, b) => (a.date <= b.date ? a : b));
      needsGrading.push({
        slot,
        oldestOutstanding: oldest.date,
        ungradedCount: outstanding.reduce((n, o) => n + o.ungradedCount, 0),
        overdue: sessionsSince(sortedSessions.get(slot.halaqa_id), oldest.date) >= 2,
      });
      continue;
    }

    const latest = latestDateBySlot.get(slot.id);
    if (!latest || latest < today) needsLesson.push(slot);
  }

  needsGrading.sort(
    (a, b) =>
      a.oldestOutstanding.localeCompare(b.oldestOutstanding) ||
      a.slot.student_name.localeCompare(b.slot.student_name)
  );
  needsLesson.sort((a, b) => a.student_name.localeCompare(b.student_name));

  return {
    needsGrading,
    needsLesson,
    doneToday: slots.length - needsGrading.length - needsLesson.length,
    totalStudents: slots.length,
  };
}

/** How many class sessions have passed since `date`, within the window. */
function sessionsSince(sessions: string[] | undefined, date: string): number {
  if (!sessions || sessions.length === 0) return 0;
  const idx = sessions.indexOf(date);
  if (idx === -1) return 0;
  return sessions.length - 1 - idx;
}
