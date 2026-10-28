# Hifdh Helper

A calm, type-led web app that joins instructors, students, and families around the daily practice of Quran memorization.

## Stack

- **Frontend:** Next.js 16, React 19, TypeScript, Tailwind CSS
- **Backend:** Supabase (Postgres, Auth, RLS, RPC functions)
- **Fonts:** Plus Jakarta Sans, Newsreader, Amiri Quran, JetBrains Mono

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in Supabase credentials
npm run dev
```

## Project structure

```
src/
  app/                  # Next.js App Router pages
  components/
    atoms/              # Wordmark, Avatar, VerseMark, Word, Streak, Status, etc.
    shells/             # MobileShell, DesktopChrome layout frames
    practice/           # PracticePlayer — free listen-and-repeat tool (landing + student tab)
  lib/                  # Supabase clients, Quran metadata (surahs, juz), shared assignment queries
supabase/
  migrations/           # SQL migrations (schema, RLS, RPC functions)
claude/
  backend.md            # Backend spec (Supabase schema, phases, RPC functions)
  ui.md                 # UI implementation notes from design handoff
public/text/
  qpc-hafs-tajweed.json       # Quran text with tajweed markup
  digital-khatt-v2Text.json   # Quran text word-by-word (iOS fallback)
DESIGN.md               # Design system spec (palette, type, components, screens)
```

## How teachers use it

1. Sign up as an instructor, create a class, add students by name.
2. Each student gets a 6-character code. They sign up as a student and enter it
   on **Join** to link their account. Teachers can keep records without this.
3. **Assign** a lesson: pick a type (New Lesson, Review, Subac, or your own),
   a surah/ayah range (or fill from a juz range), reciter and repeat count.
   Review lessons can hold several ranges.
4. On class day, open **Evaluations**, pick the student, grade each range
   Pass or Redo with a note, then assign the next lesson.
5. Each student's page shows their recent graded lessons; **View all** shows
   the full history.

Linked students see the same lesson on their phone, listen to each range the
number of times the teacher set (one listen = one full pass of the range),
then tap **Mark as ready**. Teachers see listens and the ready flag on the
grading screens.

## Database

Migrations live in `supabase/migrations/` and apply cleanly to an empty
database in order. Apply the latest with `supabase db push` (or paste into the
SQL editor). `20261028_001_sprint1_lean.sql` drops the old invite-code
tables, reseeds lesson types, and adds `end_surah` so ranges can cross surahs.
`20261028_002_student_slot_access.sql` lets a student who claimed a slot read
and act on assignments made against that slot. `20261028_003_instructor_roster.sql`
adds the `instructor_roster()` function the roster page calls.

Signed-out visitors to `/instructor`, `/student` or `/dashboard` are sent to
`/login` by `src/proxy.ts`, which also refreshes the Supabase session cookie.
