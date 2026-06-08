-- Hifdh Helper — Initial Schema
-- Phase 1: profiles, halaqat, enrollments, guardianships
-- Phase 2: lesson_types
-- Phase 3: assignments, assignment_items
-- Phase 4: listen_progress, submissions, evaluations
-- Phase 5: notes
-- Phase 6: practice_presets (optional)

-- ============================================================
-- TABLES
-- ============================================================

-- Extends auth.users with app-specific profile data
create table profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  display_name  text not null,
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

create table halaqat (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  instructor_id   uuid not null references profiles(id),
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

create table enrollments (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references profiles(id),
  halaqa_id     uuid not null references halaqat(id),
  is_active     boolean default true,
  enrolled_at   timestamptz default now(),
  unique (student_id, halaqa_id)
);

create table guardianships (
  id            uuid primary key default gen_random_uuid(),
  parent_id     uuid not null references profiles(id),
  student_id    uuid not null references profiles(id),
  created_at    timestamptz default now(),
  unique (parent_id, student_id)
);

create table lesson_types (
  id              uuid primary key default gen_random_uuid(),
  instructor_id   uuid not null references profiles(id),
  name            text not null,
  description     text,
  sort_order      int not null,
  is_active       boolean default true,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now()
);

-- Partial unique index: no duplicate active names per instructor
create unique index lesson_types_instructor_name_active
  on lesson_types (instructor_id, name)
  where is_active = true;

create table assignments (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references profiles(id),
  halaqa_id     uuid not null references halaqat(id),
  date          date not null,
  created_by    uuid not null references profiles(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  unique (student_id, date)
);

create table assignment_items (
  id                uuid primary key default gen_random_uuid(),
  assignment_id     uuid not null references assignments(id) on delete cascade,
  lesson_type_id    uuid not null references lesson_types(id),
  surah             int not null check (surah between 1 and 114),
  start_ayah        int not null check (start_ayah >= 1),
  end_ayah          int not null check (end_ayah >= start_ayah),
  reciter_ref       text,
  repetitions       int not null default 1 check (repetitions >= 1),
  created_at        timestamptz default now(),
  updated_at        timestamptz default now()
);

create table listen_progress (
  id                    uuid primary key default gen_random_uuid(),
  assignment_item_id    uuid not null unique references assignment_items(id) on delete cascade,
  listens_completed     int not null default 0,
  last_listened_at      timestamptz
);

create table submissions (
  id                    uuid primary key default gen_random_uuid(),
  assignment_item_id    uuid not null unique references assignment_items(id) on delete cascade,
  submitted_at          timestamptz default now()
);

create table evaluations (
  id                    uuid primary key default gen_random_uuid(),
  assignment_item_id    uuid not null unique references assignment_items(id) on delete cascade,
  result                text not null check (result in ('pass', 'partial', 'redo')),
  note                  text,
  evaluated_by          uuid not null references profiles(id),
  evaluated_at          timestamptz default now()
);

create table notes (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references profiles(id),
  author_id     uuid not null references profiles(id),
  body          text not null,
  created_at    timestamptz default now()
);

create table practice_presets (
  id            uuid primary key default gen_random_uuid(),
  student_id    uuid not null references profiles(id),
  label         text not null,
  surah         int not null check (surah between 1 and 114),
  start_ayah    int not null check (start_ayah >= 1),
  end_ayah      int not null check (end_ayah >= start_ayah),
  reciter_ref   text,
  repetitions   int not null default 1 check (repetitions >= 1),
  created_at    timestamptz default now()
);

-- ============================================================
-- AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================

-- When a user signs up via Supabase Auth, auto-create a profile row.
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ============================================================
-- SEED DEFAULT LESSON TYPES ON FIRST HALAQA
-- ============================================================

-- When an instructor creates their first halaqa, seed default lesson types.
create or replace function seed_lesson_types()
returns trigger as $$
begin
  -- Only seed if instructor has no lesson types yet
  if not exists (select 1 from lesson_types where instructor_id = new.instructor_id) then
    insert into lesson_types (instructor_id, name, description, sort_order) values
      (new.instructor_id, 'New Lesson', 'New verses to memorize', 1),
      (new.instructor_id, 'Review', 'Recent revision', 2),
      (new.instructor_id, 'Group Review', 'Revised together in halaqah', 3);
  end if;
  return new;
end;
$$ language plpgsql security definer;

create trigger on_halaqa_created
  after insert on halaqat
  for each row execute function seed_lesson_types();

-- ============================================================
-- RPC FUNCTIONS (business logic)
-- ============================================================

-- Atomically increment listen count. Returns new count and required reps.
create or replace function increment_listen(item_id uuid)
returns json as $$
declare
  v_student_id uuid;
  v_reps int;
  v_count int;
begin
  -- Verify the caller owns this item
  select a.student_id, ai.repetitions
  into v_student_id, v_reps
  from assignment_items ai
  join assignments a on a.id = ai.assignment_id
  where ai.id = item_id;

  if v_student_id is null then
    raise exception 'Assignment item not found';
  end if;

  if v_student_id != auth.uid() then
    raise exception 'Not your assignment item';
  end if;

  -- Upsert listen progress
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

-- Submit an item. Only allowed when listens_completed >= repetitions.
create or replace function submit_item(item_id uuid)
returns json as $$
declare
  v_student_id uuid;
  v_reps int;
  v_count int;
begin
  select a.student_id, ai.repetitions
  into v_student_id, v_reps
  from assignment_items ai
  join assignments a on a.id = ai.assignment_id
  where ai.id = item_id;

  if v_student_id is null then
    raise exception 'Assignment item not found';
  end if;

  if v_student_id != auth.uid() then
    raise exception 'Not your assignment item';
  end if;

  select coalesce(listens_completed, 0) into v_count
  from listen_progress where assignment_item_id = item_id;

  if v_count is null or v_count < v_reps then
    raise exception 'Need % more listens before submitting',
      (v_reps - coalesce(v_count, 0));
  end if;

  insert into submissions (assignment_item_id, submitted_at)
  values (item_id, now())
  on conflict (assignment_item_id)
  do update set submitted_at = now();

  return json_build_object('submitted', true, 'submitted_at', now());
end;
$$ language plpgsql security definer;

-- ============================================================
-- ROW-LEVEL SECURITY
-- ============================================================

-- Enable RLS on all tables
alter table profiles enable row level security;
alter table halaqat enable row level security;
alter table enrollments enable row level security;
alter table guardianships enable row level security;
alter table lesson_types enable row level security;
alter table assignments enable row level security;
alter table assignment_items enable row level security;
alter table listen_progress enable row level security;
alter table submissions enable row level security;
alter table evaluations enable row level security;
alter table notes enable row level security;
alter table practice_presets enable row level security;

-- ── Profiles ──

create policy "Users can read own profile"
  on profiles for select using (id = auth.uid());

create policy "Users can update own profile"
  on profiles for update using (id = auth.uid());

create policy "Instructors can read enrolled students"
  on profiles for select using (
    id in (
      select e.student_id from enrollments e
      join halaqat h on h.id = e.halaqa_id
      where h.instructor_id = auth.uid() and e.is_active
    )
  );

create policy "Parents can read child profile"
  on profiles for select using (
    id in (select student_id from guardianships where parent_id = auth.uid())
  );

-- ── Halaqat ──

create policy "Instructors can manage own halaqat"
  on halaqat for all using (instructor_id = auth.uid());

create policy "Students can read enrolled halaqat"
  on halaqat for select using (
    id in (select halaqa_id from enrollments where student_id = auth.uid() and is_active)
  );

-- ── Enrollments ──

create policy "Instructors can manage enrollments in own halaqat"
  on enrollments for all using (
    halaqa_id in (select id from halaqat where instructor_id = auth.uid())
  );

create policy "Students can read own enrollments"
  on enrollments for select using (student_id = auth.uid());

-- ── Guardianships ──

create policy "Parents can read own guardianships"
  on guardianships for select using (parent_id = auth.uid());

create policy "Instructors can read guardianships for enrolled students"
  on guardianships for select using (
    student_id in (
      select e.student_id from enrollments e
      join halaqat h on h.id = e.halaqa_id
      where h.instructor_id = auth.uid() and e.is_active
    )
  );

create policy "Instructors can create guardianships for enrolled students"
  on guardianships for insert with check (
    student_id in (
      select e.student_id from enrollments e
      join halaqat h on h.id = e.halaqa_id
      where h.instructor_id = auth.uid() and e.is_active
    )
  );

-- ── Lesson Types ──

create policy "Instructors can manage own lesson types"
  on lesson_types for all using (instructor_id = auth.uid());

create policy "Students can read their instructor lesson types"
  on lesson_types for select using (
    instructor_id in (
      select h.instructor_id from halaqat h
      join enrollments e on e.halaqa_id = h.id
      where e.student_id = auth.uid() and e.is_active
    )
  );

-- ── Assignments ──

create policy "Instructors can manage assignments in own halaqat"
  on assignments for all using (
    halaqa_id in (select id from halaqat where instructor_id = auth.uid())
  );

create policy "Students can read own assignments"
  on assignments for select using (student_id = auth.uid());

create policy "Parents can read child assignments"
  on assignments for select using (
    student_id in (select student_id from guardianships where parent_id = auth.uid())
  );

-- ── Assignment Items ──

create policy "Instructors can manage items in own halaqa assignments"
  on assignment_items for all using (
    assignment_id in (
      select a.id from assignments a
      join halaqat h on h.id = a.halaqa_id
      where h.instructor_id = auth.uid()
    )
  );

create policy "Students can read own assignment items"
  on assignment_items for select using (
    assignment_id in (select id from assignments where student_id = auth.uid())
  );

create policy "Parents can read child assignment items"
  on assignment_items for select using (
    assignment_id in (
      select a.id from assignments a
      join guardianships g on g.student_id = a.student_id
      where g.parent_id = auth.uid()
    )
  );

-- ── Listen Progress ──

create policy "Students can read own listen progress"
  on listen_progress for select using (
    assignment_item_id in (
      select ai.id from assignment_items ai
      join assignments a on a.id = ai.assignment_id
      where a.student_id = auth.uid()
    )
  );

create policy "Instructors can read listen progress for own halaqa"
  on listen_progress for select using (
    assignment_item_id in (
      select ai.id from assignment_items ai
      join assignments a on a.id = ai.assignment_id
      join halaqat h on h.id = a.halaqa_id
      where h.instructor_id = auth.uid()
    )
  );

create policy "Parents can read child listen progress"
  on listen_progress for select using (
    assignment_item_id in (
      select ai.id from assignment_items ai
      join assignments a on a.id = ai.assignment_id
      join guardianships g on g.student_id = a.student_id
      where g.parent_id = auth.uid()
    )
  );

-- ── Submissions ──

create policy "Students can read own submissions"
  on submissions for select using (
    assignment_item_id in (
      select ai.id from assignment_items ai
      join assignments a on a.id = ai.assignment_id
      where a.student_id = auth.uid()
    )
  );

create policy "Instructors can read submissions for own halaqa"
  on submissions for select using (
    assignment_item_id in (
      select ai.id from assignment_items ai
      join assignments a on a.id = ai.assignment_id
      join halaqat h on h.id = a.halaqa_id
      where h.instructor_id = auth.uid()
    )
  );

create policy "Parents can read child submissions"
  on submissions for select using (
    assignment_item_id in (
      select ai.id from assignment_items ai
      join assignments a on a.id = ai.assignment_id
      join guardianships g on g.student_id = a.student_id
      where g.parent_id = auth.uid()
    )
  );

-- ── Evaluations ──

create policy "Instructors can manage evaluations in own halaqa"
  on evaluations for all using (
    assignment_item_id in (
      select ai.id from assignment_items ai
      join assignments a on a.id = ai.assignment_id
      join halaqat h on h.id = a.halaqa_id
      where h.instructor_id = auth.uid()
    )
  );

create policy "Students can read own evaluations"
  on evaluations for select using (
    assignment_item_id in (
      select ai.id from assignment_items ai
      join assignments a on a.id = ai.assignment_id
      where a.student_id = auth.uid()
    )
  );

create policy "Parents can read child evaluations"
  on evaluations for select using (
    assignment_item_id in (
      select ai.id from assignment_items ai
      join assignments a on a.id = ai.assignment_id
      join guardianships g on g.student_id = a.student_id
      where g.parent_id = auth.uid()
    )
  );

-- ── Notes ──

create policy "Instructors can read notes for enrolled students"
  on notes for select using (
    student_id in (
      select e.student_id from enrollments e
      join halaqat h on h.id = e.halaqa_id
      where h.instructor_id = auth.uid() and e.is_active
    )
  );

create policy "Instructors can create notes for enrolled students"
  on notes for insert with check (
    author_id = auth.uid() and
    student_id in (
      select e.student_id from enrollments e
      join halaqat h on h.id = e.halaqa_id
      where h.instructor_id = auth.uid() and e.is_active
    )
  );

create policy "Parents can read notes for own child"
  on notes for select using (
    student_id in (select student_id from guardianships where parent_id = auth.uid())
  );

create policy "Parents can create notes for own child"
  on notes for insert with check (
    author_id = auth.uid() and
    student_id in (select student_id from guardianships where parent_id = auth.uid())
  );

-- ── Practice Presets ──

create policy "Students can manage own practice presets"
  on practice_presets for all using (student_id = auth.uid());
