-- Student slots: instructor-created student profiles.
-- Students appear in the roster immediately. They can optionally
-- claim their slot later by signing up and entering a code.

create table student_slots (
  id              uuid primary key default gen_random_uuid(),
  halaqa_id       uuid not null references halaqat(id) on delete cascade,
  created_by      uuid not null references profiles(id),
  student_name    text not null,
  current_surah   text,
  current_verse   text,
  claim_code      text not null unique,
  claimed_by      uuid references profiles(id),  -- null until student claims
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

alter table student_slots enable row level security;

-- Instructors can manage slots in their own halaqat
create policy "Instructors can manage own student slots"
  on student_slots for all using (
    halaqa_id in (select get_my_halaqa_ids())
  );

-- Students can read their own claimed slot
create policy "Students can read own claimed slot"
  on student_slots for select using (
    claimed_by = auth.uid()
  );

-- RPC: instructor creates a student slot with auto-generated claim code
create or replace function create_student_slot(
  halaqa_uuid uuid,
  student_name_param text,
  current_surah_param text default null,
  current_verse_param text default null
)
returns json as $$
declare
  v_code text;
  v_slot student_slots%rowtype;
begin
  -- Verify caller owns this halaqa
  if not exists (select 1 from halaqat where id = halaqa_uuid and instructor_id = auth.uid()) then
    raise exception 'Not your halaqa';
  end if;

  -- Generate a unique 6-char claim code
  v_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into student_slots (halaqa_id, created_by, student_name, current_surah, current_verse, claim_code)
  values (halaqa_uuid, auth.uid(), student_name_param, current_surah_param, current_verse_param, v_code)
  returning * into v_slot;

  return json_build_object(
    'id', v_slot.id,
    'student_name', v_slot.student_name,
    'claim_code', v_slot.claim_code
  );
end;
$$ language plpgsql security definer;

-- RPC: student claims a slot with their code
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

  -- Mark slot as claimed
  update student_slots
  set claimed_by = auth.uid(), updated_at = now()
  where id = v_slot.id;

  -- Create enrollment
  insert into enrollments (student_id, halaqa_id, is_active, enrolled_at)
  values (auth.uid(), v_slot.halaqa_id, true, now())
  on conflict (student_id, halaqa_id) do update set is_active = true, enrolled_at = now();

  -- Update student's display name to match the slot name
  update profiles
  set display_name = v_slot.student_name, updated_at = now()
  where id = auth.uid();

  return json_build_object(
    'claimed', true,
    'student_name', v_slot.student_name,
    'halaqa_id', v_slot.halaqa_id
  );
end;
$$ language plpgsql security definer;
