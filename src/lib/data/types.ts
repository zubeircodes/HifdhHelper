// Row shapes for the instructor data layer.
//
// `src/lib/supabase.ts` creates an untyped client, so every query returns
// `any`-shaped rows. These interfaces are the only thing standing between a
// schema change and a silent runtime failure. Regenerate from the database
// (`supabase gen types`) when that becomes worth wiring up.

import type { Attendance, EvalResult } from "@/lib/grade";

export interface Halaqa {
  id: string;
  name: string;
}

export interface LessonType {
  id: string;
  name: string;
  description: string | null;
  sort_order: number;
}

export interface StudentSlot {
  id: string;
  halaqa_id: string;
  student_name: string;
  current_surah: string | null;
  current_verse: string | null;
  claim_code: string;
  claimed_by: string | null;
}

export interface EvaluationRow {
  id: string;
  result: EvalResult;
  note: string | null;
  evaluated_at: string | null;
}

export interface AssignmentItemRow {
  id: string;
  lesson_type_id: string;
  surah: number;
  start_ayah: number;
  end_ayah: number;
  reciter_ref: string | null;
  repetitions: number;
  // PostgREST returns embedded to-one relations as an object, but has been
  // known to return a single-element array. Never read these directly —
  // go through `one()` / `evalOf()` in ./normalize.
  lesson_types?: LessonType | LessonType[] | null;
  evaluations?: EvaluationRow | EvaluationRow[] | null;
}

export interface AssignmentRow {
  id: string;
  date: string;
  halaqa_id: string;
  student_slot_id: string | null;
  attendance: Attendance | null;
  assignment_items: AssignmentItemRow[];
}
