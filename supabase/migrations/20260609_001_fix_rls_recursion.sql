-- Fix infinite RLS recursion: policies must not chain through
-- other RLS-protected tables. Use auth.uid() directly.

-- ── Drop problematic policies ──

drop policy if exists "Instructors can read enrolled students" on profiles;
drop policy if exists "Parents can read child profile" on profiles;

drop policy if exists "Instructors can manage enrollments in own halaqat" on enrollments;
drop policy if exists "Students can read own enrollments" on enrollments;

drop policy if exists "Students can read enrolled halaqat" on halaqat;

drop policy if exists "Instructors can read guardianships for enrolled students" on guardianships;
drop policy if exists "Instructors can create guardianships for enrolled students" on guardianships;

drop policy if exists "Students can read their instructor lesson types" on lesson_types;

drop policy if exists "Instructors can manage assignments in own halaqat" on assignments;
drop policy if exists "Students can read own assignments" on assignments;
drop policy if exists "Parents can read child assignments" on assignments;

drop policy if exists "Instructors can manage items in own halaqa assignments" on assignment_items;
drop policy if exists "Students can read own assignment items" on assignment_items;
drop policy if exists "Parents can read child assignment items" on assignment_items;

drop policy if exists "Students can read own listen progress" on listen_progress;
drop policy if exists "Instructors can read listen progress for own halaqa" on listen_progress;
drop policy if exists "Parents can read child listen progress" on listen_progress;

drop policy if exists "Students can read own submissions" on submissions;
drop policy if exists "Instructors can read submissions for own halaqa" on submissions;
drop policy if exists "Parents can read child submissions" on submissions;

drop policy if exists "Instructors can manage evaluations in own halaqa" on evaluations;
drop policy if exists "Students can read own evaluations" on evaluations;
drop policy if exists "Parents can read child evaluations" on evaluations;

drop policy if exists "Instructors can read notes for enrolled students" on notes;
drop policy if exists "Instructors can create notes for enrolled students" on notes;
drop policy if exists "Parents can read notes for own child" on notes;
drop policy if exists "Parents can create notes for own child" on notes;

-- ── Helper functions to avoid RLS recursion ──
-- These query tables with SECURITY DEFINER to bypass RLS.

create or replace function get_my_halaqa_ids()
returns setof uuid as $$
  select id from halaqat where instructor_id = auth.uid();
$$ language sql security definer stable;

create or replace function get_my_student_ids()
returns setof uuid as $$
  select e.student_id from enrollments e
  where e.halaqa_id in (select id from halaqat where instructor_id = auth.uid())
    and e.is_active;
$$ language sql security definer stable;

create or replace function get_my_child_ids()
returns setof uuid as $$
  select student_id from guardianships where parent_id = auth.uid();
$$ language sql security definer stable;

create or replace function get_my_enrolled_halaqa_ids()
returns setof uuid as $$
  select halaqa_id from enrollments where student_id = auth.uid() and is_active;
$$ language sql security definer stable;

create or replace function get_my_assignment_ids()
returns setof uuid as $$
  select id from assignments where student_id = auth.uid();
$$ language sql security definer stable;

create or replace function get_my_halaqa_assignment_ids()
returns setof uuid as $$
  select a.id from assignments a
  where a.halaqa_id in (select id from halaqat where instructor_id = auth.uid());
$$ language sql security definer stable;

create or replace function get_child_assignment_ids()
returns setof uuid as $$
  select a.id from assignments a
  where a.student_id in (select student_id from guardianships where parent_id = auth.uid());
$$ language sql security definer stable;

create or replace function get_my_assignment_item_ids()
returns setof uuid as $$
  select ai.id from assignment_items ai
  join assignments a on a.id = ai.assignment_id
  where a.student_id = auth.uid();
$$ language sql security definer stable;

create or replace function get_my_halaqa_assignment_item_ids()
returns setof uuid as $$
  select ai.id from assignment_items ai
  join assignments a on a.id = ai.assignment_id
  where a.halaqa_id in (select id from halaqat where instructor_id = auth.uid());
$$ language sql security definer stable;

create or replace function get_child_assignment_item_ids()
returns setof uuid as $$
  select ai.id from assignment_items ai
  join assignments a on a.id = ai.assignment_id
  where a.student_id in (select student_id from guardianships where parent_id = auth.uid());
$$ language sql security definer stable;

-- ── Recreate policies using helper functions ──

-- Profiles
create policy "Instructors can read enrolled students"
  on profiles for select using (id in (select get_my_student_ids()));

create policy "Parents can read child profile"
  on profiles for select using (id in (select get_my_child_ids()));

-- Halaqat
create policy "Students can read enrolled halaqat"
  on halaqat for select using (id in (select get_my_enrolled_halaqa_ids()));

-- Enrollments
create policy "Instructors can manage enrollments in own halaqat"
  on enrollments for all using (halaqa_id in (select get_my_halaqa_ids()));

create policy "Students can read own enrollments"
  on enrollments for select using (student_id = auth.uid());

-- Guardianships
create policy "Instructors can read guardianships for enrolled students"
  on guardianships for select using (student_id in (select get_my_student_ids()));

create policy "Instructors can create guardianships for enrolled students"
  on guardianships for insert with check (student_id in (select get_my_student_ids()));

-- Lesson Types
create policy "Students can read their instructor lesson types"
  on lesson_types for select using (
    instructor_id in (
      select h.instructor_id from halaqat h
      where h.id in (select get_my_enrolled_halaqa_ids())
    )
  );

-- Assignments
create policy "Instructors can manage assignments in own halaqat"
  on assignments for all using (halaqa_id in (select get_my_halaqa_ids()));

create policy "Students can read own assignments"
  on assignments for select using (student_id = auth.uid());

create policy "Parents can read child assignments"
  on assignments for select using (student_id in (select get_my_child_ids()));

-- Assignment Items
create policy "Instructors can manage items in own halaqa assignments"
  on assignment_items for all using (assignment_id in (select get_my_halaqa_assignment_ids()));

create policy "Students can read own assignment items"
  on assignment_items for select using (assignment_id in (select get_my_assignment_ids()));

create policy "Parents can read child assignment items"
  on assignment_items for select using (assignment_id in (select get_child_assignment_ids()));

-- Listen Progress
create policy "Students can read own listen progress"
  on listen_progress for select using (assignment_item_id in (select get_my_assignment_item_ids()));

create policy "Instructors can read listen progress for own halaqa"
  on listen_progress for select using (assignment_item_id in (select get_my_halaqa_assignment_item_ids()));

create policy "Parents can read child listen progress"
  on listen_progress for select using (assignment_item_id in (select get_child_assignment_item_ids()));

-- Submissions
create policy "Students can read own submissions"
  on submissions for select using (assignment_item_id in (select get_my_assignment_item_ids()));

create policy "Instructors can read submissions for own halaqa"
  on submissions for select using (assignment_item_id in (select get_my_halaqa_assignment_item_ids()));

create policy "Parents can read child submissions"
  on submissions for select using (assignment_item_id in (select get_child_assignment_item_ids()));

-- Evaluations
create policy "Instructors can manage evaluations in own halaqa"
  on evaluations for all using (assignment_item_id in (select get_my_halaqa_assignment_item_ids()));

create policy "Students can read own evaluations"
  on evaluations for select using (assignment_item_id in (select get_my_assignment_item_ids()));

create policy "Parents can read child evaluations"
  on evaluations for select using (assignment_item_id in (select get_child_assignment_item_ids()));

-- Notes
create policy "Instructors can read notes for enrolled students"
  on notes for select using (student_id in (select get_my_student_ids()));

create policy "Instructors can create notes for enrolled students"
  on notes for insert with check (
    author_id = auth.uid() and student_id in (select get_my_student_ids())
  );

create policy "Parents can read notes for own child"
  on notes for select using (student_id in (select get_my_child_ids()));

create policy "Parents can create notes for own child"
  on notes for insert with check (
    author_id = auth.uid() and student_id in (select get_my_child_ids())
  );
