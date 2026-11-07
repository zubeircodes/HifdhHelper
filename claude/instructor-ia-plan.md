# Instructor IA refactor · summary emails · student access without accounts

## Context

Three problems, one plan.

**The IA is fragmented.** Five nav tabs and four separate student lists, each with its own
query and markup, all reading the same `student_slots` table:

| Page | Shows |
|---|---|
| `/instructor` ("Students") | name · current lesson · passed · class · status |
| `/instructor/classes` | same roster grouped by class, + claim code |
| `/instructor/evaluate` ("Evaluations") | same roster again, as link rows |
| `/instructor/assignments/new` | same roster again, as checkboxes |

`/instructor` and `/instructor/evaluate` differ only in their title and where a row links.
`classes` and `categories` emit no links at all — dead ends. And `/instructor/students/[id]`,
the page that should hold a student's work, is 104 lines of placeholder reading *"Assignment
history will appear here once you start assigning lessons to {name}."*

**Nothing reaches the family.** After class, nobody learns anything. The goal: after every
class, an email saying whether the student passed and what to prepare next.

**Student accounts are friction nobody wants.** Children are being asked to sign up and type
claim codes to reach a lesson. The student side is mostly stubbed anyway — `/student` renders
a hardcoded `sampleAssignment`, a fake streak of 12, and a fake instructor note; the player has
no audio. Replace all of it with a durable link that opens straight to the lesson, ready to play.

**Outcome:** three instructor tabs, one workbench where grading and assigning happen inline, a
post-class summary email triggered by grading, and a no-login lesson link for families.

### Decisions

- **Tabs:** `Today · Classes · Setup`. Evaluations deleted; Assignments becomes Today.
- **Assigning:** inline on the student profile.
- **Class schedule:** real, set in Setup. *Reverses the earlier "derive it" decision* — and
  makes "due next class" a genuine date.
- **Send trigger:** **event-driven** — a Database Webhook fires when grading completes a
  session — with a **once-daily backstop**. Not a polling cron.
- **Absent:** attendance, modelled separately from the grade.
- **Contacts:** `guardian_*` on the roster. Now load-bearing: with no student accounts, the
  guardian email is the only address there is.
- **Student accounts:** removed for now, to return when the app is further along. The DB keeps
  its account machinery dormant so bringing them back is cheap.
- **Student access:** durable per-student tokenized link, `/l/<token>`.
- **Three existing blockers:** fixed in Phase 2, before anything moves.

---

# Part A — IA refactor

## Target shape

```
TABS (rail + mobile, one shared definition)
    Today              /instructor
    Classes            /instructor/classes
    Setup              /instructor/categories

DETAIL PAGES (not tabs)
    Student profile    /instructor/students/[id]    ← the workbench
    Bulk assign        /instructor/assignments/new
    Onboarding         /instructor/setup            (kept: only path for a new instructor)

PUBLIC
    /                  landing + free practice
    /l/<token>         a student's lesson, no login

DELETED
    /instructor/evaluate  + /[id]  + /[id]/[lessonId]
    /instructor/assignments        (history → student profile)
    /student/*                     (see Part D)
```

**Rule: additive first, flip nav second, delete last.** Every phase ends with the app working
and `npm run build` clean. Two deliberate inversions: Classes absorbs the roster *before* Today
replaces it, so the roster never vanishes; the dedup sweep runs *last*, because three of the
seven `getInitials` copies delete themselves in Phase 8.

### Phase 0 — recon — ✅ DONE (2026-11-07)

Run against the live project. Results:

1. **Embed shape: OBJECT or `null`, not an array.** PostgREST detects the to-one
   relation correctly (`evaluations_assignment_item_id_key` is UNIQUE). The highest
   risk in this plan is retired. `normalize.ts` still routes every read through
   `one()`/`evalOf()` as insurance.
2. **No `fail` rows.** `evaluations` holds exactly **1 row**, result `pass` — the
   check constraint `pass | partial | redo` always rejected `fail`. No backfill.
   One successful grade in the project's whole history is itself the bug report.
3. **Duplicates confirmed — Phase 2b is mandatory.** 10 `assignment_items`, **2
   duplicate `(assignment_id, lesson_type_id)` pairs** (Surah 61:1–12 four times).
   **Zero** duplicate pairs have both rows graded, so the dedupe loses nothing.
4. **Baseline:** 2 classes, 5 students, 6 assignments, 10 items, 1 evaluation,
   5 lesson types, 1 enrollment. Real roster is `Bellevue Hifdh` (5 students);
   `Zoom Class` is empty.

#### ⚠️ The repo's migrations are three behind the live database

`20261028212844`, `20261028213417`, `20261028214042` were applied 28 Oct and exist
nowhere in `supabase/migrations/`. `supabase db pull` refuses on the ledger
mismatch and its suggested `migration repair --status reverted` would delete those
rows while leaving the schema in place — a worse state. Use `supabase db dump`
instead, which reads the schema without touching the ledger.

What actually changed, verified against the dump:

| | Repo migrations say | Live database |
|---|---|---|
| `assignment_items.end_surah` | absent | **present**, backfilled on all 10 rows |
| cross-surah CHECK constraints | absent | **present** on `assignment_items` and `practice_presets` |
| `invite_codes` table | exists | **dropped** |
| `generate_invite_code` / `redeem_invite_code` | exist | **dropped** |
| `instructor_roster()` | — | **exists**, unused by the app |
| `owns_assignment_item()` | — | **exists**, unused by the app |
| `evaluations_result_check` | `pass\|partial\|redo` | unchanged — confirmed |
| unique on `(assignment_id, lesson_type_id)` | absent | **still absent** |

Consequences folded into the plan below: Part C shrinks (invite codes already gone),
Risk 7 inverts (the schema supports cross-surah; the *app* is the gap), and Phase 4
gets a ready-made RPC.

### Phase 1 — shared primitives, nothing wired

**Create:**
- `src/lib/format.ts` — `getInitials`, `surahName`, `formatAyahRange`, `formatDate`, and
  **`todayISO()` built from local date parts** (Risk 3).
- `src/lib/grade.ts` — `EVAL_RESULTS = ["pass","partial","redo"]`, `EvalResult`,
  `GRADE_OPTIONS`. The enforcement point that makes `"fail"` unrepresentable.
- `src/lib/ayah-range.ts` — `validateRange`, lifted from `assignments/new/page.tsx:194-231`.
- `src/lib/data/` — `selects.ts`, `normalize.ts` (`one()`, `evalOf()`), `instructor-context.ts`,
  `roster.ts`, `grading.ts`, `assigning.ts`, `student-workbench.ts`, `today.ts`, `lesson-types.ts`.
- `src/components/shells/instructor-nav.ts` — one `INSTRUCTOR_TABS` + one `isTabActive`.

**Modify:**
- `globals.css` — **add** `--redo: oklch(0.52 0.10 28);` after line 71 and a `.hh-status.redo`
  pair after line 280. **Do not rename `--fail`**: it is the form-validation error color in
  `classes:153,201`, `assignments/new:271,328`, `setup:172,208`. Adding keeps
  `var(--${opt.k})` at `[lessonId]:219` working untouched.
- `status.tsx:6` — union becomes `"pass" | "partial" | "redo" | "muted"`. `tsc` then proves
  every call site; only `evaluate/[id]/page.tsx:178` breaks, and that file dies in Phase 8.

**Delete:** `src/lib/sample-data.ts` — 199 lines, zero importers.

**Keep every instructor page a client component.** There is no `middleware.ts`, so
`supabase-server.ts`'s cookie `setAll` is swallowed in server components and an expired token
can never refresh. Worse, with RLS a stale-cookie server render returns `{data: [], error: null}`
— a logged-in instructor silently sees "No students yet". Every data function takes
`client: SupabaseClient` as its first argument and contains zero React, so an RSC migration
later is a call-site swap plus middleware, not a rewrite.

### Phase 2 — data layer + all three bug fixes, still on the old IA

Fix grading inside the existing chain **before** any page moves, so a failure is never
ambiguous between "my new query is wrong" and "grading was always broken."

In `evaluate/[id]/[lessonId]/page.tsx`:
- **Bug 3** — delete the `.eq("date", today)` filter (43-56); use `getGradableAssignment`,
  which takes the latest assignment for the slot. Same at `evaluate/[id]/page.tsx:65-101`.
- **Bug 2** — line 119, replace `getVerseRange(1,1,1,4)` with the item's real
  `surah/start_ayah/end_ayah`; lines 158-160, replace the literal `Al-Fātiḥah · 1:1–4` with
  `formatAyahRange(item)`.
- **Bug 1** — line 210, drive the segmented control off `GRADE_OPTIONS` so Redo writes `"redo"`.
- **Remove the `mistakes` slider** (28, 229-240). `evaluations` has no column for it.

**Proof (one test closes all three):** assign Al-Baqarah 2:30–35 → mushaf shows six Al-Baqarah
verses, `h1` reads "Al-Baqarah · 2:30–35" → grade **Redo** → saves, and
`select result from evaluations order by evaluated_at desc limit 1` returns `redo` → then
`update assignments set date = current_date - 7` and confirm it still loads and still grades.

### Phase 2b — `assignment_items` uniqueness migration

No unique on `(assignment_id, lesson_type_id)` and `assignments/new:152-162` blind-inserts, so
re-assigning the same category the same day duplicates the row and corrupts queue counts and
email content.

Dedupe keeping the graded row (`order by (e.id is not null) desc, created_at asc`), then
`create unique index assignment_items_assignment_lesson on assignment_items (assignment_id, lesson_type_id);`
`assignLesson` then uses `.upsert({...}, { onConflict: "assignment_id,lesson_type_id" })`.

**Hazard:** `.upsert` with an `onConflict` lacking a matching unique index fails at runtime with
Postgres `42P10`. **Apply the migration before the code deploys** — two-step release.

### Phase 3 — the workbench at `/instructor/students/[id]`

Four co-located files: `page.tsx` (shell + hero), `grade-panel.tsx`, `assign-panel.tsx`,
`history-list.tsx`.

One query for the whole history, reusing the same `selects.ts` constant as Today so the two
can't drift:

```ts
client.from("assignments")
  .select(SELECT_ASSIGNMENT_GRADED)   // items → lesson_types + evaluations, nested
  .eq("student_slot_id", slotId)
  .order("date", { ascending: false });
```

`current = history[0]`, `past = history.slice(1)`. Sort items within an assignment by
`lesson_types.sort_order` in JS. Do **not** add `.eq("is_active", true)` to the `lesson_types`
embed — a category soft-deleted last month must still render its name on old assignments.

**Grade panel** carries the one-tap toggles: Pass / Partial / Redo, plus Present / Absent /
Excused. **Assign panel prefills from the prior item** (`surah = item.surah`,
`startVerse = item.end_ayah + 1`). Do not parse `current_surah`/`current_verse` — free text
(`"Al-Baqarah (2)"`, `"30–35"` with an en dash); parsing them is a trap.

Also on this page: the student's **lesson link** with copy, WhatsApp share, and "Reset link"
(Part C).

**Remove line 64's link to `/instructor/evaluate/${id}`** — must die before Phase 8.

**Mushaf is collapsible per item, lazy.** `loadQuranData()` pulls a **4.0 MB** JSON. Module-cached,
so once per page load, but Today must never trigger it.

### Phase 4 — Classes absorbs the roster

Student rows (`classes/page.tsx:248-269`) become links to `/instructor/students/{id}`. Carry
over "Passed n/m" — but source it from **`instructor_roster()`**, the SECURITY DEFINER
RPC already in the database and granted to `authenticated`. It returns
`latest_assignment_id, latest_date, total_items, graded_items, passed_items,
submitted_items` per slot: exactly what `/instructor/page.tsx:70-103` computes with
three queries per student. Nothing in `src/` calls it. One RPC replaces the N+1. Replace the claim-code
column with the lesson link + WhatsApp share. Fix empty-state copy pointing at tabs that will
no longer exist (`instructor:172`, `evaluate:77`, `evaluate/[id]:150`).

### Phase 5 — Today queue at `/instructor`

Two flat queries, fixed count regardless of roster size:

```ts
// A — every assignment in the window, items + types + grades, one round trip
client.from("assignments").select(SELECT_ASSIGNMENT_GRADED)
  .in("halaqa_id", ctx.halaqaIds)
  .gte("date", windowStartISO).lte("date", todayISO())
  .order("date", { ascending: true });

// B — full roster (students with zero assignments can't appear in A,
//     and they are exactly the "needs a lesson" case)
client.from("student_slots").select(SELECT_SLOT)
  .in("halaqa_id", ctx.halaqaIds).order("student_name");
```

Partition in a **pure exported `deriveTodayQueue(slots, assignments, today)`** — the repo has
zero tests, so keeping the one piece of non-obvious logic DB-free makes it testable later.

- *Needs grading* — has an ungraded assignment with `date <= today`, oldest first.
- *Needs a lesson* — not in the first group, and latest assignment date `< today`.

**Because the summary email now fires on grading completion, Today shows the gate**: when a
class meets today, a banner reads *"Maghrib Halaqa · 4 students still ungraded — summaries send
when you finish."* That banner is the whole reason the queue exists.

Redirect to `/login` when `getInstructorContext()` returns null, instead of hanging on
"Loading..." forever as `instructor/page.tsx:40` does.

### Phase 6 — Setup

Keep the autosaving category editor. Add **Class schedules** (Part B) and notification settings.
**Do not delete `/instructor/setup`** — it is the onboarding wizard and the only path for a new
instructor (`dashboard/page.tsx:29` routes there when `halaqat` is empty). Edit line 131
"Go to dashboard" → "Go to Today", and drop the dead invite-code step (Part D).

### Phase 7 — nav flip

Both shells import `INSTRUCTOR_TABS` and `isTabActive`; delete the duplicated arrays
(`rail:9-18`, `header:7-13` — three of five labels drifted) and the duplicated `isActive`
(`rail:40-43`, `header:18-21`). `/instructor/students/*` now highlights **Classes**;
`/instructor/assignments/new` highlights **Today**.

Repoint `assignments/new/page.tsx:181` (`router.push`) and `:256` (back-link) away from
`/instructor/assignments` — **before** Phase 8. Add one redirect stub:
`evaluate/[id]` → `/instructor/students/[id]`.

Mobile 5 tabs → 3 needs no CSS change (`.hh-tab { flex: 1 }`); verify at 375px anyway.

### Phase 8 — deletions

`evaluate/page.tsx`, `evaluate/[id]/[lessonId]/page.tsx`, `evaluate/[id]/page.tsx` (or keep as
the redirect stub), `assignments/page.tsx`. **Keep `assignments/new/page.tsx`** — there is no
`assignments/layout.tsx`, so the child route keeps working while the parent 404s. Intended.

### Phase 9 — dedup sweep

Four `getInitials` copies remain plus the inline one at `instructor-rail.tsx:31-36`. Same for
the remaining `auth.getUser()` → `halaqat` → `student_slots` preambles → `getInstructorContext`.
**Proof:** `grep -rn "function getInitials" src/` returns exactly one hit.

---

# Part B — Post-class summary emails

## Schema

```sql
create table class_schedules (
  id uuid primary key default gen_random_uuid(),
  halaqa_id uuid not null references halaqat(id) on delete cascade,
  weekday smallint not null check (weekday between 0 and 6),
  start_time time not null,
  end_time time not null,
  created_at timestamptz default now(),
  unique (halaqa_id, weekday, start_time)
);

alter table halaqat
  add column timezone text not null default 'UTC',       -- IANA, e.g. America/New_York
  add column summaries_enabled boolean not null default false;

-- one row per actual meeting; the idempotency anchor
create table class_sessions (
  id uuid primary key default gen_random_uuid(),
  halaqa_id uuid not null references halaqat(id) on delete cascade,
  session_date date not null,
  status text not null default 'open'
    check (status in ('open','cancelled','sending','sent')),
  summaries_sent_at timestamptz,
  unique (halaqa_id, session_date)
);

-- attendance, deliberately NOT a grade
alter table assignments
  add column attendance text check (attendance in ('present','absent','excused'));

alter table student_slots
  add column guardian_name text,
  add column guardian_email text,
  add column guardian_phone text,
  add column summary_opt_out boolean not null default false;

-- delivery log: idempotency + debugging + proof of what was sent
create table summary_emails (
  id uuid primary key default gen_random_uuid(),
  class_session_id uuid not null references class_sessions(id) on delete cascade,
  student_slot_id uuid not null references student_slots(id) on delete cascade,
  to_email text not null,
  subject text not null,
  body_snapshot text,
  status text not null check (status in ('queued','sent','failed','skipped')),
  error text,
  sent_at timestamptz,
  unique (class_session_id, student_slot_id)   -- ← the no-double-send guarantee
);
```

RLS on new tables follows the existing pattern: `halaqa_id in (select get_my_halaqa_ids())`.

## Trigger: event-driven, with a daily backstop

Time-based polling sends whether or not class happened. The signal that actually matters is
*the teacher finished grading*.

1. **Database Webhook** on `evaluations` insert/update and on `assignments.attendance` update
   → calls the Edge Function.
2. The function evaluates **session completeness**: for the halaqa and date, every student slot
   that has an assignment for that date has either `attendance in ('absent','excused')` or an
   `evaluations` row for **every** one of its `assignment_items`. Slots with no assignment that
   day are not part of the session.
3. If complete and `status = 'open'`, claim it (`status = 'sending'`, conditional update — the
   claim is what makes concurrent webhooks safe), compose, send, mark `sent`.
4. **Backstop:** one `pg_cron` job, once daily, finds sessions still `open` past a cutoff and
   sends what exists, marking ungraded students "not assessed". This covers the one failure
   mode event-driven has: the teacher never finishes.

Why this beats polling:

| Case | 10-min cron | Event-driven |
|---|---|---|
| Class runs long | sends mid-class | waits for grading |
| Class cancelled | sends anyway | nothing graded → nothing sends |
| Class ends early | sends late | sends immediately |
| Grading never finished | sends partial | backstop catches it that night |

## Cost

All scheduling lives in **Supabase**, not Vercel, so the Vercel plan is irrelevant to this
feature. Supabase's free tier covers Database Webhooks, `pg_cron`, and Edge Functions; Resend's
free tier is roughly 3,000 emails/month at 100/day. Effectively zero until real scale.

Two caveats worth confirming before committing:
- **Vercel Hobby** restricts cron to a small number of jobs at daily frequency, with
  minute-level scheduling on Pro (~$20/mo/member) — and Hobby's terms are non-commercial. Not
  needed here, but verify current limits if you ever move scheduling to Vercel.
- **Supabase free tier pauses a project after about a week of inactivity**, which would silently
  stop sends. A live class won't hit it; a quiet month might.

## What the email says

Per student, one line per lesson category — a hifdh student carries sabaq, sabqi and manzil at
once, so "top of the stack" is per category, not global:

| Today's outcome | What they prepare for next class |
|---|---|
| `pass` | the newly assigned item for that category |
| `partial` / `redo` | **the same item again** |
| `absent` / `excused` | the same item again, untouched |
| present but ungraded | the same item again, marked "not assessed" |

Subject: *"Ahmad — class summary, Tue 5 Nov"*. Body: results, what to prepare, **the lesson
link** (Part C), and an unsubscribe link.

The "top of stack" resolver is a **pure function in `src/lib/next-lesson.ts`**, shared by the
email composer, the `/l/<token>` page, and the workbench's assign prefill — so what the family
is told, what the link opens, and what the teacher sees can never disagree.

## UI

**Setup** gains *Class schedules* (days, times, timezone), a master on/off defaulting to
**off**, and **"Send me a preview"** — composes a real summary for one student and mails it to
the instructor. That is how the content gets proven without touching a family.

**Today** gains the ungraded gate banner and **"Cancel today's session"** →
`class_sessions.status = 'cancelled'`, suppressing the send.

## Phases

- **N1** — schema + RLS. No behavior change.
- **N2** — attendance toggles in the workbench; contact fields in Classes and the workbench.
- **N3** — `class_schedules` editor, timezone, master toggle (off). Today's gate banner and
  cancel control.
- **N4** — `next-lesson.ts` resolver + templates + preview send. **No automation yet.**
- **N5** — Edge Function, Database Webhook, daily backstop `pg_cron`, Resend secrets. Enable
  for one real class first.

Depends on Part A Phases 1–5.

---

# Part C — Student access without accounts

## The link

```sql
create table lesson_links (
  id uuid primary key default gen_random_uuid(),
  student_slot_id uuid not null references student_slots(id) on delete cascade,
  token_hash text not null unique,        -- sha256 of a 32-byte URL-safe random token
  revoked boolean not null default false,
  created_at timestamptz default now(),
  last_opened_at timestamptz,
  open_count int not null default 0
);
```

One durable link per student: `/l/<token>`, always showing their **current** lesson. The family
bookmarks it once. Raw tokens are never stored — only the hash — so a database leak doesn't hand
over every student's link. Rotating is one row update plus a fresh token; the teacher does it
from the workbench with "Reset link."

## Access without `auth.uid()`

**Use a `security definer` RPC, not a service role key.** The codebase already does this —
`claim_student_slot` and `create_student_slot` are both `security definer` — so it is idiomatic
here, and it keeps the service role key out of the Next.js runtime entirely.

```sql
create function get_lesson_by_token(token text)
returns json
language plpgsql security definer set search_path = public
as $$ ... $$;
```

It hashes the incoming token, looks up a non-revoked link, bumps `open_count`/`last_opened_at`,
and returns **only** that student's name, their current assignment's items (surah, ayah range,
reciter, repetitions), and the last class's results. Callable with the anon key. No RLS policy
change, no new secret in the web app, nothing else reachable.

## The page

`/l/<token>` renders the existing **`PracticePlayer`** with the assignment's surah, ayah range,
reciter and repetitions prefilled — the player already works end-to-end with real audio on the
landing page, so this is wiring, not new machinery. Above it: "Today's lesson for Ahmad", what
to prepare, and last class's result. Below: a link into free practice.

A 32-byte token makes enumeration infeasible, but add basic rate limiting on the RPC anyway.
Treat the link as a bearer credential: it exposes a child's name, their lesson, their grade, and
the teacher's note. Low sensitivity, not zero — which is why it is revocable.

## Sharing

The teacher shares the link from the workbench or Classes:
- **Copy link**
- **WhatsApp** — `https://wa.me/<guardian_phone>?text=<encoded>`, falling back to
  `https://wa.me/?text=…` (contact picker) when no number is stored
- the summary email carries it automatically

Automated WhatsApp (Cloud API) stays a separate project: Meta Business verification, a dedicated
number not already on WhatsApp, pre-approved templates, per-conversation billing. Email covers
the automated case; WhatsApp covers the human one.

## Phases

- **C1** — `lesson_links` table + `get_lesson_by_token` RPC + token generation on slot creation,
  backfilled for existing slots.
- **C2** — `/l/<token>` page wired to `PracticePlayer`.
- **C3** — share controls in the workbench and Classes; link included in the email template.

---

# Part D — Retiring student accounts

Removed **for now**, to return when the app is further along. So: retire the surfaces, keep the
machinery dormant.

**Delete** (all stubbed or now redundant):
- `src/app/student/page.tsx` — hardcoded `sampleAssignment`, fake streak of 12, fake note
- `src/app/student/player/page.tsx` — no audio, hardcoded Al-Fātiḥah
- `src/app/student/you/page.tsx` — auth metadata only
- `src/app/student/join/page.tsx` — claim codes have no role now
- `src/app/student/layout.tsx` once the above are gone

**Move:** `src/app/student/practice/page.tsx` → a public `/practice`. It needs no auth and is
the same component the landing page already embeds.

**Modify:**
- `src/app/signup/page.tsx` — offer the instructor path only; drop the student/parent role cards
- `src/app/dashboard/page.tsx` — route instructors only; remove the `/parent` redirect at line
  34, which points at a route that has never existed

**Keep dormant, do not drop:** `enrollments`, `student_slots.claim_code`, `claim_student_slot`,
`invite_codes`, `redeem_invite_code`, and the student/parent RLS policies. They cost nothing
and make bringing accounts back a wiring job rather than a migration. Note that
`redeem_invite_code` is already dead — **never called anywhere in `src/`** — and the code shown
at `/instructor/setup:81` could never be redeemed.

Consequence: `assignments.student_id` is now always null and the student-side RLS policies go
unused. That retires the known bug where a student who claimed a slot *after* a lesson was
assigned could never see it.

---

## Key risks

1. **Embed to-one vs to-many (highest).** If `evaluations` returns an array where the code
   expects an object, every item reads as ungraded, the queue never drains, **session
   completeness never fires, and no email ever sends**. Route every read through `evalOf()`,
   and settle it in Phase 0.
2. **Never embed `profiles`.** `assignments` has two FKs to it (`student_id`, `created_by`), so
   `profiles(display_name)` returns HTTP 300 and fails the whole query. **Names come from
   `student_slots.student_name`.**
3. **Timezones.** `new Date().toISOString().split("T")[0]` at `assignments/new:100`,
   `evaluate/[id]:67`, `[lessonId]:44` already files evening assignments under tomorrow's date
   for anyone west of UTC. Fix `todayISO()` with local parts in Phase 1; store IANA timezones
   per halaqa, never offsets, or DST breaks it twice a year.
4. **Session completeness is the new critical path.** If the predicate is subtly wrong — a slot
   with no assignment counted as blocking, say — summaries silently never send and the only
   symptom is families not hearing anything. Make it a pure, separately testable function; the
   daily backstop is the safety net.
5. **The lesson link is a bearer credential.** Long random token, stored hashed, revocable,
   rate-limited. It exposes a minor's name, lesson, grade and teacher's note.
6. **Emailing families is a commitment.** Unsubscribe honoured via `summary_opt_out`, and a
   verified sending domain, or mail lands in spam and the feature silently does nothing. Confirm
   consent for minors' data with whoever runs the madrasah.
7. **`assignment_items.surah` is one column but bulk-assign collects two.**
   `assignments/new:157` writes `surah: startSurahNum` and drops `endSurahNum` — so cross-surah
   assignments are *already* stored wrong, and would be described wrongly in an email and
   opened wrongly by the link. Restrict inline assign to a single surah; flag the bulk picker.
8. **Ordering hazards:** `students/[id]:64` loses its evaluate link in Phase 3;
   `assignments/new:181,256` repointed in Phase 7; the Phase 2b index reaches the database
   before the upsert code deploys.
9. **No safety net.** Zero tests in the repo. `npm run build` + `npx tsc --noEmit` are the only
   automated gates — which is why `deriveTodayQueue`, the completeness predicate, and the
   next-lesson resolver are all pure functions, and why the email preview exists before automation.

---

## Verification

Every phase: `npx tsc --noEmit` + `npm run build` + `npm run lint` clean. Two pre-existing
`react-hooks/set-state-in-effect` errors in `instructor/categories` and `instructor/classes`
are unrelated — don't count them as new.

- **Phase 2** — the four-step grading test; Redo saving proves grading works for the first time.
- **Phase 3** — grade student A through the workbench and B through the old chain; diff
  `evaluations`. Identical shapes.
- **Phase 5** — five constructed states assert placement and ordering; network tab shows 5
  fixed requests against the Phase 0 baseline of `1 + 3N`.
- **Phase 8** — `grep -rn "instructor/evaluate" src/` returns nothing; click every link.
- **C2** — open `/l/<token>` in a private window, signed out, on a phone. The lesson loads
  prefilled and plays. A revoked token shows a clean "ask your teacher for a new link".
- **N3** — set a schedule, confirm `class_sessions` materialises correctly in the class's
  timezone. Test a class scheduled across a DST boundary.
- **N4** — preview-send every branch to yourself: pass, partial, redo, absent, present-ungraded,
  no-assignment. Read each as a parent would. Click the link in each.
- **N5** — enable for one class. Grade every student → summaries send within seconds. Then:
  leave one student ungraded → nothing sends until the backstop; cancel a session → nothing
  sends; force a duplicate webhook → `unique` violation, no second email; opted-out student
  gets nothing.

---

## Out of scope, worth tracking

- **`assignments.halaqa_id` goes stale** if a slot ever moves class. No UI moves slots today.
- **RLS scaling cliff.** `get_my_halaqa_assignment_item_ids()` returns every item id in the
  instructor's halaqat with `in (select …)`, materialized per row. Fine at hundreds; eventually
  rewrite as `exists (…)`.
- **`evaluations.corrections`** — if the mistakes count matters, it needs a column.
- **Listen tracking.** `listen_progress` and the `increment_listen` RPC exist and are unused.
  The lesson link could record listens against the slot, giving the teacher "listened 4 of 5
  times" before class. Genuinely useful for hifdh; not required for the loop.
- **Bringing accounts back.** Dormant machinery plus the `guardianships` table (working RLS,
  zero code) is the foundation for student history, streaks, parent logins, and the eventual
  Tarteel integration.
