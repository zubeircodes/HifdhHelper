-- Allow assignments to reference student_slots directly.
-- This lets instructors assign and evaluate unclaimed students.

-- Add student_slot_id to assignments
alter table assignments
  add column student_slot_id uuid references student_slots(id) on delete cascade,
  alter column student_id drop not null;

-- Add student_slot_id to assignment_items index for faster lookups
create index idx_assignments_slot on assignments(student_slot_id) where student_slot_id is not null;

-- Update unique constraint: one assignment per slot per day
-- (keep the existing student_id,date constraint too)
create unique index assignments_slot_date on assignments(student_slot_id, date) where student_slot_id is not null;

-- RLS: instructors can manage assignments for their student slots
create policy "Instructors can manage slot assignments"
  on assignments for all using (
    student_slot_id in (
      select ss.id from student_slots ss
      where ss.halaqa_id in (select get_my_halaqa_ids())
    )
  );

-- RLS: allow instructors to manage assignment items for slot-based assignments
create policy "Instructors can manage slot assignment items"
  on assignment_items for all using (
    assignment_id in (
      select a.id from assignments a
      where a.student_slot_id in (
        select ss.id from student_slots ss
        where ss.halaqa_id in (select get_my_halaqa_ids())
      )
    )
  );

-- RLS: allow instructors to manage evaluations for slot-based assignments
create policy "Instructors can manage slot evaluations"
  on evaluations for all using (
    assignment_item_id in (
      select ai.id from assignment_items ai
      join assignments a on a.id = ai.assignment_id
      where a.student_slot_id in (
        select ss.id from student_slots ss
        where ss.halaqa_id in (select get_my_halaqa_ids())
      )
    )
  );
