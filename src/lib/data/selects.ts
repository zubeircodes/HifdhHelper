// Shared PostgREST select strings.
//
// The Today queue and the student workbench must read assignments the SAME way
// — if they drift, the teacher sees one thing and the family is emailed
// another. One constant, two call sites.
//
// Note: no page previously used embedded selects; every join was N separate
// `.in()` calls plus client-side Maps. All the foreign keys exist, so embeds
// work and collapse the N+1.

export const SELECT_ASSIGNMENT_GRADED = `
  id,
  date,
  halaqa_id,
  student_slot_id,
  attendance,
  assignment_items (
    id,
    lesson_type_id,
    surah,
    start_ayah,
    end_ayah,
    reciter_ref,
    repetitions,
    lesson_types ( id, name, description, sort_order ),
    evaluations ( id, result, note, evaluated_at )
  )
`;

export const SELECT_SLOT =
  "id, halaqa_id, student_name, current_surah, current_verse, claim_code, claimed_by";

// NEVER embed `profiles` from `assignments`: it has two foreign keys to that
// table (`student_id`, `created_by`), so PostgREST returns HTTP 300 "more than
// one relationship found" and fails the entire query. Student names come from
// `student_slots.student_name`.
