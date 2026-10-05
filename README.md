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
  lib/                  # Supabase client utilities
supabase/
  migrations/           # SQL migrations (schema, RLS, RPC functions)
claude/
  backend.md            # Backend spec (Supabase schema, phases, RPC functions)
  ui.md                 # UI implementation notes from design handoff
text/
  qpc-hafs-tajweed.json       # Quran text with tajweed markup
  digital-khatt-v2Text.json   # Quran text word-by-word (iOS fallback)
DESIGN.md               # Design system spec (palette, type, components, screens)
```
