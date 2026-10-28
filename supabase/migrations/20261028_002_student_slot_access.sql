-- ============================================================
-- Sprint 2: students act on slot-based assignments
--
-- Assignments are created against a student_slot, often before the student
-- has an account. Once the slot is claimed the student must be able to read
-- those assignments and record listens / submissions on them. The RLS helper
-- functions below are what the student policies call, so redefining them is
-- enough; the policies themselves are unchanged.
-- ============================================================

-- Assignments that belong to me: by student_id, or through my claimed slot.
create or replace function get_my_assignment_ids()
returns setof uuid as $$
  select a.id from assignments a
  where a.student_id = auth.uid()
     or a.student_slot_id in (select id from student_slots where claimed_by = auth.uid());
$$ language sql security definer stable;

create or replace function get_my_assignment_item_ids()
returns setof uuid as $$
  select ai.id from assignment_items ai
  join assignments a on a.id = ai.assignment_id
  where a.student_id = auth.uid()
     or a.student_slot_id in (select id from student_slots where claimed_by = auth.uid());
$$ language sql security definer stable;

-- Claiming a slot now also stamps student_id on any assignments already
-- made for that slot, so older rows behave like new ones.
create or replace function claim_student_slot(code text)
returns json as $$
declare
  v_slot student_slots%rowtype;
begin
  select * into v_slot
  from student_slots
  where claim_code = upper(code)
    and claimed_by is null;

  if v_slot.id is null then
    raise exception 'Invalid or already claimed code';
  end if;

  update student_slots
  set claimed_by = auth.uid(), updated_at = now()
  where id = v_slot.id;

  insert into enrollments (student_id, halaqa_id, is_active, enrolled_at)
  values (auth.uid(), v_slot.halaqa_id, true, now())
  on conflict (student_id, halaqa_id) do update set is_active = true, enrolled_at = now();

  update profiles
  set display_name = v_slot.student_name, updated_at = now()
  where id = auth.uid();

  update assignments
  set student_id = auth.uid(), updated_at = now()
  where student_slot_id = v_slot.id and student_id is null;

  return json_build_object(
    'claimed', true,
    'student_name', v_slot.student_name,
    'halaqa_id', v_slot.halaqa_id
  );
end;
$$ language plpgsql security definer;

-- Ownership check shared by the two student RPCs.
create or replace function owns_assignment_item(item_id uuid)
returns boolean as $$
  select exists (
    select 1 from assignment_items ai
    join assignments a on a.id = ai.assignment_id
    left join student_slots ss on ss.id = a.student_slot_id
    where ai.id = item_id
      and (a.student_id = auth.uid() or ss.claimed_by = auth.uid())
  );
$$ language sql security definer stable;

create or replace function increment_listen(item_id uuid)
returns json as $$
declare
  v_reps int;
  v_count int;
begin
  if not owns_assignment_item(item_id) then
    raise exception 'Not your assignment item';
  end if;

  select repetitions into v_reps from assignment_items where id = item_id;

  insert into listen_progress (assignment_item_id, listens_completed, last_listened_at)
  values (item_id, 1, now())
  on conflict (assignment_item_id)
  do update set
    listens_completed = listen_progress.listens_completed + 1,
    last_listened_at = now();

  select listens_completed into v_count
  from listen_progress where assignment_item_id = item_id;

  return json_build_object(
    'listens_completed', v_count,
    'repetitions', v_reps,
    'can_submit', v_count >= v_reps
  );
end;
$$ language plpgsql security definer;

create or replace function submit_item(item_id uuid)
returns json as $$
declare
  v_reps int;
  v_count int;
begin
  if not owns_assignment_item(item_id) then
    raise exception 'Not your assignment item';
  end if;

  select repetitions into v_reps from assignment_items where id = item_id;

  select coalesce(listens_completed, 0) into v_count
  from listen_progress where assignment_item_id = item_id;

  if v_count < v_reps then
    raise exception 'Need % more listens before submitting', (v_reps - v_count);
  end if;

  insert into submissions (assignment_item_id, submitted_at)
  values (item_id, now())
  on conflict (assignment_item_id)
  do update set submitted_at = now();

  return json_build_object('submitted', true, 'submitted_at', now());
end;
$$ language plpgsql security definer;
