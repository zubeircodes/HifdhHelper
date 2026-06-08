-- Invite codes for halaqa enrollment.
-- Instructors generate a short code; students enter it to join.

create table invite_codes (
  id          uuid primary key default gen_random_uuid(),
  halaqa_id   uuid not null references halaqat(id) on delete cascade,
  code        text not null unique,
  created_by  uuid not null references profiles(id),
  is_active   boolean default true,
  max_uses    int,                -- null = unlimited
  use_count   int not null default 0,
  expires_at  timestamptz,        -- null = never expires
  created_at  timestamptz default now()
);

alter table invite_codes enable row level security;

-- Instructors can manage codes for their own halaqat
create policy "Instructors can manage own invite codes"
  on invite_codes for all using (
    halaqa_id in (select get_my_halaqa_ids())
  );

-- Anyone authenticated can read a code (to validate it)
create policy "Authenticated users can read active codes"
  on invite_codes for select using (
    is_active = true
    and (expires_at is null or expires_at > now())
    and (max_uses is null or use_count < max_uses)
  );

-- RPC: redeem an invite code → enroll the student
create or replace function redeem_invite_code(invite_code text)
returns json as $$
declare
  v_code invite_codes%rowtype;
  v_enrollment_id uuid;
begin
  -- Find the code
  select * into v_code
  from invite_codes
  where code = invite_code
    and is_active = true
    and (expires_at is null or expires_at > now())
    and (max_uses is null or use_count < max_uses);

  if v_code.id is null then
    raise exception 'Invalid or expired invite code';
  end if;

  -- Check if already enrolled
  if exists (
    select 1 from enrollments
    where student_id = auth.uid()
      and halaqa_id = v_code.halaqa_id
      and is_active = true
  ) then
    raise exception 'You are already enrolled in this class';
  end if;

  -- Enroll the student
  insert into enrollments (student_id, halaqa_id, is_active, enrolled_at)
  values (auth.uid(), v_code.halaqa_id, true, now())
  on conflict (student_id, halaqa_id) do update set is_active = true, enrolled_at = now()
  returning id into v_enrollment_id;

  -- Increment use count
  update invite_codes set use_count = use_count + 1 where id = v_code.id;

  return json_build_object(
    'enrolled', true,
    'enrollment_id', v_enrollment_id,
    'halaqa_name', (select name from halaqat where id = v_code.halaqa_id)
  );
end;
$$ language plpgsql security definer;

-- RPC: generate an invite code for a halaqa
create or replace function generate_invite_code(halaqa_uuid uuid, max_uses_param int default null)
returns json as $$
declare
  v_code text;
  v_id uuid;
begin
  -- Verify caller owns this halaqa
  if not exists (select 1 from halaqat where id = halaqa_uuid and instructor_id = auth.uid()) then
    raise exception 'Not your halaqa';
  end if;

  -- Generate a 6-character alphanumeric code
  v_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));

  insert into invite_codes (halaqa_id, code, created_by, max_uses)
  values (halaqa_uuid, v_code, auth.uid(), max_uses_param)
  returning id into v_id;

  return json_build_object(
    'id', v_id,
    'code', v_code
  );
end;
$$ language plpgsql security definer;
