// The single source of truth for evaluation results.
//
// The database constraint is `check (result in ('pass','partial','redo'))`, but
// the UI sent "fail" — so grading a Redo always failed. Routing every grade
// through `EvalResult` makes "fail" unrepresentable at the type level.

export const EVAL_RESULTS = ["pass", "partial", "redo"] as const;

export type EvalResult = (typeof EVAL_RESULTS)[number];

export const GRADE_OPTIONS: { value: EvalResult; label: string }[] = [
  { value: "pass", label: "Pass" },
  { value: "partial", label: "Partial" },
  { value: "redo", label: "Redo" },
];

export function isEvalResult(v: unknown): v is EvalResult {
  return typeof v === "string" && (EVAL_RESULTS as readonly string[]).includes(v);
}

/** CSS custom property for a result. `--pass`, `--partial`, `--redo` all exist. */
export function gradeColorVar(result: EvalResult): string {
  return `var(--${result})`;
}

export function gradeLabel(result: EvalResult): string {
  return GRADE_OPTIONS.find((o) => o.value === result)?.label ?? result;
}

// Attendance is deliberately NOT a grade: "absent" is not a judgement about a
// recitation, and an absent student's lesson stays on the stack untouched.
export const ATTENDANCE_VALUES = ["present", "absent", "excused"] as const;

export type Attendance = (typeof ATTENDANCE_VALUES)[number];

export const ATTENDANCE_OPTIONS: { value: Attendance; label: string }[] = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "excused", label: "Excused" },
];

export function isAttendance(v: unknown): v is Attendance {
  return typeof v === "string" && (ATTENDANCE_VALUES as readonly string[]).includes(v);
}

/** An absent or excused student is accounted for without having been graded. */
export function isExcusedFromGrading(a: Attendance | null | undefined): boolean {
  return a === "absent" || a === "excused";
}
