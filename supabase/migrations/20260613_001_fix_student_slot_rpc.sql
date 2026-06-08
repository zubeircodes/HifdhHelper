-- Fix: the create_student_slot function needs to bypass RLS on halaqat lookup.
-- Recreate with explicit search_path and ensure it works as security definer.

create or replace function create_student_slot(
  halaqa_uuid uuid,
  student_name_param text,
  current_surah_param text default null,
  current_verse_param text default null
)
returns json as $$
declare
  v_code text;
  v_slot_id uuid;
  v_instructor_id uuid;
begin
  -- Look up the halaqa's instructor (bypasses RLS via security definer)
  select instructor_id into v_instructor_id
  from halaqat
  where id = halaqa_uuid;

  if v_instructor_id is null then
    raise exception 'Halaqa not found';
  end if;

  if v_instructor_id != auth.uid() then
    raise exception 'Not your halaqa';
  end if;

  -- Generate a unique 6-char claim code
  v_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into student_slots (halaqa_id, created_by, student_name, current_surah, current_verse, claim_code)
  values (halaqa_uuid, auth.uid(), student_name_param, current_surah_param, current_verse_param, v_code)
  returning id into v_slot_id;

  return json_build_object(
    'id', v_slot_id,
    'student_name', student_name_param,
    'claim_code', v_code
  );
end;
$$ language plpgsql security definer set search_path = public;
