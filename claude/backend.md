# Hifdh Helper — Backend Spec

A phased implementation plan using **Next.js + Supabase**. Each phase has a clear
goal, the schema it introduces, and acceptance criteria that must pass before
moving on.

---

## 1. Scope

The backend supports three interacting roles around the daily practice of Quran
memorization (hifdh):

- **Instructor** — creates a circle (halaqa), assigns daily lessons, tracks how
  many times each student has listened, evaluates submissions, leaves notes for
  families.
- **Student** — sees today's lesson, listens to it the prescribed number of
  times, submits once the requirement is met, and can freely practice any verses.
- **Parent** — follows their child's progress (read-only) and replies to the
  instructor's notes.

The interaction loop is: **instructor assigns -> student listens the required
number of times -> student submits -> instructor evaluates -> parent follows and
replies.** Separately, **practice mode** lets a student loop any verse range
client-side, independent of assignments.

Out of scope for this build: audio recordings, voice recognition, Tarteel AI
integration, multi-school tenancy (admin role).

---

## 2. Decisions & assumptions

| # | Decision | Why / how to flip later |
|---|----------|--------------------------|
| D1 | **Submission means "I listened the prescribed number of times."** Listening is tracked as a per-item counter via a Postgres RPC function; submitting is a separate act allowed only once the counter reaches the teacher's required `repetitions`. No audio is uploaded. | Adding audio later means adding a storage bucket reference to `submissions`. The listen-tracking model is unchanged. |
| D2 | **No multi-school tenancy.** There is no `schools` table; the world is a flat set of users, circles, and relationships. The admin role is deferred. | Adding tenancy later means introducing a `schools` root and scoping queries by `school_id`. Designed to be additive. |
| D3 | **Quran content is referenced, not stored.** The database stores surah/ayah numbers and an optional `reciter_ref` string. Verse text comes from static JSON files in the frontend. | Validation of ayah ranges uses a static surah-to-ayah-count lookup in the frontend and in a Postgres check function. |
| D4 | **Assignments are always instructor-created.** Students cannot self-assign. | `created_by` is recorded so self-assign can be added later without a migration. |
| D5 | **Roles are derived from relationships, not stored on the user.** A user is an instructor if they own a halaqa, a parent if they have a guardianship, a student if they're enrolled. | Keeps multi-role people correct. The frontend computes the role list from relationships. |
| D6 | **Listens are tracked as a counter, not a per-listen log.** One `listen_progress` row per assignment item holds `listens_completed` and `last_listened_at`. Incrementing is done via an atomic Postgres RPC function. | If you later need per-listen timestamps, add a `listen_events` log table and derive the count. Additive. |
| D7 | **Practice mode is fully client-side.** The looping itself needs no backend. An optional `practice_presets` table lets a student save custom ranges to reuse. | Phase 6 is optional. If you don't want saved presets, skip it — practice mode still works. |
| D8 | **Audio is referenced via a source-agnostic `reciter_ref`.** The frontend maps it to a playback URL. MVP streams from everyayah.com; at scale, switch to a CDN or the Quran Foundation Audio API. | Changing audio provider is a frontend config change, never a migration. |

---

## 3. Tech stack & conventions

- **Frontend:** Next.js 15 (App Router), React, TypeScript.
- **Backend:** Supabase (hosted Postgres, Auth, Row-Level Security, RPC functions, real-time).
- **Auth:** Supabase Auth (email/password). JWTs issued by Supabase, validated automatically by the client library.
- **Database:** PostgreSQL via Supabase. Migrations managed by Supabase CLI.
- **IDs:** UUID primary keys on every table (Supabase default).
- **Timestamps:** All datetimes stored as `timestamptz` (UTC).
- **Soft delete:** Use an `is_active` boolean where specified. Never hard-delete rows that historical records reference.
- **Quran data:** Static JSON files (`text/qpc-hafs-tajweed.json`, `text/digital-khatt-v2Text.json`) served from the frontend, cached by service worker.
- **Audio:** Streamed from everyayah.com, referenced by `reciter_ref`.

### Authorization model

Authorization is enforced via **Row-Level Security (RLS) policies** on every
table. This is the source of truth — the frontend never bypasses RLS.

| Resource / action | Instructor | Student | Parent |
|-------------------|-----------|---------|--------|
| Own user profile | RW | RW | RW |
| Halaqa they own | RW | — | — |
| Enrollment (own halaqa) | RW | R (own) | — |
| Lesson types (own) | RW | R (own instructor's) | — |
| Assignment | CRUD (own halaqa students) | R (own) | R (their child) |
| Listen progress | R (own halaqa) | increment via RPC / R | R (their child) |
| Submission | R | create via RPC / R (own) | R (their child) |
| Evaluation | CRU (own halaqa) | R (own) | R (their child) |
| Note thread | CR (their student) | — | CR (their child) |
| Practice presets | — | RW (own) | — |

---

## 4. Data model

The complete schema. Phases introduce these tables incrementally.

```sql
-- Extends Supabase auth.users; stores app-specific profile data.
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
  updated_at      timestamptz default now(),
  unique (instructor_id, name)  -- enforced only where is_active = true via partial index
);

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
```

### RPC functions (business logic in Postgres)

```sql
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

  if v_student_id != auth.uid() then
    raise exception 'Not your assignment item';
  end if;

  select coalesce(listens_completed, 0) into v_count
  from listen_progress where assignment_item_id = item_id;

  if v_count < v_reps then
    raise exception 'Need % more listens before submitting',
      (v_reps - v_count);
  end if;

  insert into submissions (assignment_item_id, submitted_at)
  values (item_id, now())
  on conflict (assignment_item_id)
  do update set submitted_at = now();

  return json_build_object('submitted', true, 'submitted_at', now());
end;
$$ language plpgsql security definer;
```

---

## 5. Phases

### Phase 0 — Project foundation

**Goal:** A running Next.js app with Supabase connected, the design system
scaffolded, and the database schema ready.

**Includes:**
- Next.js 15 project initialized at repo root (replacing old frontend files).
- Supabase CLI initialized with local development setup.
- Design tokens (CSS custom properties from the design spec) as a global stylesheet.
- Supabase client configured and connecting.
- A health-check page that confirms Supabase connectivity.

**Acceptance criteria:**
- [ ] `npm run dev` starts the app without errors.
- [ ] The app connects to Supabase and can query the database.
- [ ] Design tokens from the spec are available as CSS custom properties.
- [ ] The old frontend files are removed; docs (DESIGN.md, ROADMAP.md, etc.) are preserved.

---

### Phase 1 — Auth and relationships

**Goal:** Users can sign up, log in, and form relationships. Instructors own
halaqat; students are enrolled; parents are linked to children. Roles are derived
from relationships.

**Tables:** `profiles`, `halaqat`, `enrollments`, `guardianships`.

**RLS policies:**
- `profiles`: users can read/update their own profile. Instructors can read
  profiles of students in their halaqa. Parents can read their child's profile.
- `halaqat`: instructors can CRUD their own. Students can read halaqat they're
  enrolled in.
- `enrollments`: instructors can manage enrollments in their halaqa. Students
  can read their own.
- `guardianships`: parents can read their own. Instructors can read guardianships
  for students in their halaqa.

**Pages:**
- Landing page (from design spec).
- Sign-up with role selection (the 4-card picker from the design).
- Login page.
- Role-based redirect after login.

**Acceptance criteria:**
- [ ] A user can sign up with email/password and is redirected to the correct
      dashboard shell based on their relationships.
- [ ] An instructor can create a halaqa and enroll students.
- [ ] A parent can be linked to a student via guardianship.
- [ ] RLS prevents cross-user data access (a student cannot see another
      student's enrollment).

---

### Phase 2 — Lesson types

**Goal:** Each instructor owns an editable, ordered, named list of lesson types,
seeded with defaults.

**Tables:** `lesson_types`.

**Behavior:**
- On first access, seed three defaults: "New Lesson", "Review", "Group Review"
  (matching the design spec). Fully editable/deletable afterward.
- Soft delete via `is_active`.

**Pages:**
- Lesson categories settings screen (from the design spec — CRUD list with
  inline editing, reorder, remove, add).

**Acceptance criteria:**
- [ ] A new instructor starts with the three seeded lesson types.
- [ ] An instructor can rename, reorder, add, and soft-delete lesson types.
- [ ] RLS prevents cross-instructor access.

---

### Phase 3 — Assignments

**Goal:** An instructor builds a student's day as one assignment header with
items, each a verse range with required listens.

**Tables:** `assignments`, `assignment_items`.

**Pages:**
- New Assignment form (from the design — lesson type selector, surah/verse
  inputs, preview card, reciter select, repeat slider, student picker).
- Instructor single-student view showing assigned lessons.
- Student dashboard showing today's assignment.

**Acceptance criteria:**
- [ ] An instructor can create a multi-item assignment for a student.
- [ ] One assignment per student per day (unique constraint).
- [ ] Surah/ayah range validation (check constraints in Postgres).
- [ ] Students see only their own assignments.

---

### Phase 4 — Listening, submission, and evaluation

**Goal:** Track listens via RPC, gate submission on listen count, record
instructor evaluations. This is the core loop.

**Tables:** `listen_progress`, `submissions`, `evaluations`.

**RPC functions:** `increment_listen`, `submit_item`.

**Pages:**
- Quran player (the centerpiece — mushaf reading area, tajweed, transport
  controls, listen tracking).
- Student assignment detail with per-item progress and submit CTA.
- Instructor evaluation panel (split view: mushaf + grade/notes form).

**Acceptance criteria:**
- [ ] Each listen atomically increments the counter via RPC.
- [ ] A student cannot submit until listens >= repetitions.
- [ ] An instructor can evaluate with pass/partial/redo + a note.
- [ ] RLS + RPC enforce that students can only act on their own items.

---

### Phase 5 — Notes thread

**Goal:** Per-student conversation between instructor and parent(s).

**Tables:** `notes`.

**Pages:**
- Parent notes thread (chat-like, from the design spec).
- Parent dashboard (read-only progress + instructor notes).

**Acceptance criteria:**
- [ ] A parent can read and post to their child's thread.
- [ ] An instructor can read and post to any enrolled student's thread.
- [ ] Evaluation notes can optionally mirror into the thread.
- [ ] RLS prevents access to unrelated students' threads.

---

### Phase 6 — Practice presets (optional)

**Goal:** Let students save custom verse ranges for reuse. Practice mode itself
is fully client-side.

**Tables:** `practice_presets`.

**Acceptance criteria:**
- [ ] A student can save, list, and delete their own presets.
- [ ] RLS prevents cross-student access.
- [ ] Presets are independent of assignments.

---

## 6. Supabase RLS policy patterns

All policies follow these patterns:

**"Own data" pattern:**
```sql
create policy "Users can read own profile"
  on profiles for select
  using (id = auth.uid());
```

**"Instructor sees their halaqa's students" pattern:**
```sql
create policy "Instructors can read enrolled students"
  on profiles for select
  using (
    id in (
      select e.student_id from enrollments e
      join halaqat h on h.id = e.halaqa_id
      where h.instructor_id = auth.uid() and e.is_active
    )
  );
```

**"Parent sees their child" pattern:**
```sql
create policy "Parents can read child data"
  on assignments for select
  using (
    student_id in (
      select student_id from guardianships
      where parent_id = auth.uid()
    )
  );
```

---

## 7. Definition of done (whole backend)

- [ ] All phases' acceptance criteria pass (Phase 6 is optional per D7).
- [ ] Every table has RLS enabled with appropriate policies.
- [ ] RPC functions enforce business logic (listen gating, submission gating).
- [ ] Supabase migrations are clean and reproducible (`supabase db reset` works).
- [ ] The decisions in section 2 are reflected in the schema and easy to locate.
