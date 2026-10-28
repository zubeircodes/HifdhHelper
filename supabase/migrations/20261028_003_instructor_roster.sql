-- ============================================================
-- Sprint 3: one call for the instructor roster
--
-- Returns one row per student slot the caller teaches, with a summary of
-- that slot's most recent assignment. Replaces a client-side fetch of every
-- assignment for every student.
-- ============================================================

create or replace function instructor_roster()
returns table (
  id uuid,
  student_name text,
  current_surah text,
  current_verse text,
  claimed_by uuid,
  halaqa_id uuid,
  latest_assignment_id uuid,
  latest_date date,
  total_items int,
  graded_items int,
  passed_items int,
  submitted_items int
) as $$
  with my_slots as (
    select ss.*
    from student_slots ss
    where ss.halaqa_id in (select h.id from halaqat h where h.instructor_id = auth.uid())
  ),
  latest as (
    select distinct on (a.student_slot_id) a.student_slot_id, a.id, a.date
    from assignments a
    where a.student_slot_id in (select id from my_slots)
    order by a.student_slot_id, a.date desc, a.created_at desc
  ),
  summary as (
    select l.student_slot_id,
           l.id as assignment_id,
           l.date,
           count(ai.id)::int as total_items,
           count(e.assignment_item_id)::int as graded_items,
           count(e.assignment_item_id) filter (where e.result = 'pass')::int as passed_items,
           count(s.assignment_item_id)::int as submitted_items
    from latest l
    left join assignment_items ai on ai.assignment_id = l.id
    left join evaluations e on e.assignment_item_id = ai.id
    left join submissions s on s.assignment_item_id = ai.id
    group by l.student_slot_id, l.id, l.date
  )
  select ms.id, ms.student_name, ms.current_surah, ms.current_verse, ms.claimed_by, ms.halaqa_id,
         su.assignment_id, su.date,
         coalesce(su.total_items, 0), coalesce(su.graded_items, 0),
         coalesce(su.passed_items, 0), coalesce(su.submitted_items, 0)
  from my_slots ms
  left join summary su on su.student_slot_id = ms.id
  order by ms.student_name;
$$ language sql security definer stable;

revoke all on function instructor_roster() from public;
grant execute on function instructor_roster() to authenticated;
