# Hifdh Helper — UI Implementation Notes

> Source: Claude Design handoff bundle (exported 2026-04-28 / updated 2026-05-09).
> These notes are for the coding agent implementing the production app.
> **Do not make code changes based on this file alone** — use it as reference alongside DESIGN.md and the prototype source files.

---

## 1. Design Bundle Inventory

The handoff contains these files (extracted to `.claude/.../design-extract/hifdh-helper/`):

| File | Purpose |
|------|---------|
| `project/Hifdh Helper.html` | Host HTML — loads React 18 via CDN + Babel, wires all scripts |
| `project/tokens.css` | Full design token system (CSS custom properties) |
| `project/atoms.jsx` | Shared atomic components (Wordmark, Avatar, VerseMark, Word, Streak, Status, Eyebrow, MobileShell, DesktopChrome, InstructorRail, Ico icons) |
| `project/data.js` | Sample data: Al-Fatihah tokens with tajweed tags, students, assignments, notes, reciters, surahs, lesson categories |
| `project/screens-auth.jsx` | Landing, Signup (role select), Login |
| `project/screens-instructor.jsx` | InstructorDashboard (roster), InstructorStudent (single student), NewAssignmentForm, EvaluatePanel, CategorySettings |
| `project/screens-student.jsx` | StudentDashboard, QuranPlayer, StudentAssignmentDetail |
| `project/screens-other.jsx` | ParentDashboard, ParentAssignmentNotes, AdminDashboard, AdminInstructors |
| `project/app.jsx` | DesignCanvas layout wiring all 14 screens into 5 sections |
| `project/design-canvas.jsx` | Figma-like pan/zoom canvas (prototype-only, not for production) |
| `project/tweaks-panel.jsx` | Floating density/accent tweaks (prototype-only) |
| `chats/chat1.md` | Initial design conversation — includes the user rejecting the first "analytics dashboard" design and requesting calm/paper-toned/type-led/Quranic aesthetic |
| `chats/chat2.md` | Follow-up: teacher-defined lesson categories replacing hard-coded sabaq/sabqi/manzil |

---

## 2. Design Tokens (from tokens.css)

### 2.1 Paper Surfaces (warm cream, never pure white)

```css
--paper-0: #f6f1e8;   /* canvas / off-frame background */
--paper-1: #fbf7ef;   /* primary surface */
--paper-2: #ffffff;   /* raised elements (cards, inputs) */
--paper-3: #efe9dc;   /* inset / hover / secondary panels */
--paper-4: #e6dfce;   /* strong divider tone */
```

### 2.2 Ink (warm dark brown-black, never pure black)

```css
--ink-0: #1f1c14;   /* primary text, headings */
--ink-1: #4a463a;   /* body text */
--ink-2: #7a7565;   /* meta / secondary / labels */
--ink-3: #a8a294;   /* tertiary / placeholder text */
--ink-4: #cac2af;   /* disabled / very faint */
```

### 2.3 Hairlines (use instead of borders)

```css
--rule-1: rgba(31,28,20,0.07);   /* lightest — between table rows */
--rule-2: rgba(31,28,20,0.14);   /* medium — input borders, stepper */
--rule-3: rgba(31,28,20,0.24);   /* strongest — verse mark circles, radio indicators */
```

### 2.4 Sage Accent (oklch — herbal, never green-green)

```css
--sage-h: 142;
--sage-c: 0.04;
--sage:        oklch(0.46 var(--sage-c) var(--sage-h));
--sage-deep:   oklch(0.32 var(--sage-c) var(--sage-h));
--sage-soft:   oklch(0.78 var(--sage-c) var(--sage-h));
--sage-wash:   oklch(0.93 var(--sage-c) var(--sage-h));
--sage-fg:     #fbf7ef;   /* text on sage backgrounds */
```

### 2.5 Status Colors (earthy, desaturated)

```css
--pass:    oklch(0.48 0.06 145);   /* muted green */
--partial: oklch(0.62 0.09 70);    /* earthy amber */
--fail:    oklch(0.52 0.10 28);    /* warm red-brown */
```

### 2.6 Tajweed Colors (softened Madinah-mushaf, on paper background)

```css
--tj-ghunnah:  #b08840;   /* nasal sounds — warm gold */
--tj-ikhfa:    #8a5e8e;   /* concealment — muted purple */
--tj-idgham:   #4f7295;   /* merging — dusty blue */
--tj-iqlab:    #6b803e;   /* conversion — olive */
--tj-qalqalah: #2f7e7e;   /* echoing — teal */
--tj-madda-2:  #6e6a5c;   /* 2-count extension — warm grey */
--tj-madda-4:  #b85a37;   /* 4-count extension — burnt sienna */
--tj-madda-6:  #a83b30;   /* 6-count extension — deep red */
--tj-silent:   #b3ad9d;   /* silent letters — faded */
```

Applied via `color:` on individual tokens only — **never as backgrounds**.

### 2.7 Typography

```css
--serif:  "Newsreader", "Georgia", "Iowan Old Style", serif;
--sans:   "Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif;
--mono:   "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;
--arabic: "Amiri Quran", "Scheherazade New", "Traditional Arabic", serif;
```

Google Fonts load URL:
```
https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Newsreader:ital,opsz,wght@0,6..72,300;0,6..72,400;0,6..72,500;1,6..72,400&family=JetBrains+Mono:wght@400;500&family=Amiri+Quran&display=swap
```

Type scale (px):
- **Display** (Newsreader): 56 / 38 / 34 / 32 / 28 / 26 / 24 — weight 400, letter-spacing -0.022em, line-height 1.05
- **Serif body** (Newsreader): 19 / 18 / 17 / 16 / 15 / 14 — weight 400, letter-spacing -0.012em
- **Sans UI** (Plus Jakarta): 14.5 / 13.5 / 13 / 12.5 / 12 / 11.5 / 11 / 10.5 — weight 400/500 only
- **Eyebrow**: 10-11px uppercase, letter-spacing 0.14em, color var(--ink-2), weight 500
- **Arabic**: fontSize 22-44px depending on context, line-height 1.9-2.1, direction rtl

### 2.8 Spacing Scale

```css
--space-xs: 6px;   --space-sm: 10px;  --space-md: 16px;
--space-lg: 24px;  --space-xl: 36px;  --space-2xl: 56px;
```

Compact density overrides (set `data-density="compact"` on `.hh` root):
```css
--space-md: 11px;  --space-lg: 16px;  --space-xl: 24px;  --space-2xl: 36px;
```

### 2.9 Radii

```css
--r-sm: 4px;  --r-md: 8px;  --r-lg: 12px;
```

**No shadows anywhere.** Depth = paper-tone shifts + hairlines.

---

## 3. Atomic Components

### 3.1 Icons (Ico)

Eight SVG icons, 1.25px stroke, default size 14px. Each takes a `s` prop for size.

| Name | Use |
|------|-----|
| `back` | Nav breadcrumbs, player prev |
| `fwd` | Nav forward, player next |
| `play` | Player play (filled triangle) |
| `pause` | Player pause (two filled rects) |
| `search` | Search field affordance |
| `plus` | "New" buttons |
| `check` | Selection checkmarks (default 12px) |
| `more` | Overflow menu (three dots) |

**Critical:** Always set `flex: 0 0 auto` on the SVG wrapper. Icons appear ONLY in: nav crumbs, player transport, search affordance, selection checks, "New" buttons. Never decorative.

### 3.2 Wordmark

`Hifdh` in Newsreader regular + `Helper` in Newsreader italic weight 300. No logo/icon — just text. Default size 17-18px.

### 3.3 Mark

Small leaf SVG flourish (sage-deep, 18px). Used very sparingly — mostly wordmark alone.

### 3.4 Avatar

Initials-only circle. No photos ever. Properties:
- `initials`: 2-letter string
- `size`: default 28px (range: 22-64px across screens)
- `tone`: background color, default `var(--paper-3)`
- Font size = size * 0.36, weight 500
- 1px `var(--rule-1)` border, full border-radius

### 3.5 VerseMark

Eastern Arabic numeral in a hairline circle. Used to mark each ayah in the Quran player.
- `n`: verse number converted to Eastern Arabic digits
- `size`: default 22px (20px in player)
- 0.75px `var(--rule-3)` border
- Font: `var(--arabic)`, size = size * 0.55

Eastern Arabic digit mapping: 0=٠ 1=١ 2=٢ 3=٣ 4=٤ 5=٥ 6=٦ 7=٧ 8=٨ 9=٩

### 3.6 Word

Single Arabic token with optional tajweed tinting.
- `token`: `{ a: "Arabic text", t?: "ghunnah" | "madda-2" | etc. }`
- Color: `var(--tj-${token.t})` if `t` present, else `var(--ink-0)`
- Inline margin: 0.18em

### 3.7 Streak

14-day dot row — **the only chart in the app**.
- `data`: array of 14 integers (0 = missed, 1-5 = intensity)
- `size`: default 6px dot diameter (7px on mobile)
- `gap`: default 5px (6px on mobile)
- Filled dots: `var(--sage-deep)`, opacity scales with value (0.5 + v * 0.1)
- Empty dots: transparent with 1px `var(--rule-2)` border, opacity 0.6

### 3.8 Status

Text label + 5px colored dot. **No pills, no backgrounds.**
- `kind`: `pass | partial | fail | muted`
- Colors from `var(--pass)`, `var(--partial)`, `var(--fail)`, `var(--ink-2/3)`
- Font: 11px, weight 500, letter-spacing 0.02em
- Dot rendered via `::before` pseudo-element

### 3.9 Eyebrow / Overline

Uppercase tracked label. Two variants:
- `.hh-eyebrow`: standalone label (10px, uppercase, 0.14em tracking, ink-2)
- `.hh-overline`: label + extending hairline rule (10px, 0.16em tracking, `::after` flex hairline)

---

## 4. Layout Shells

### 4.1 MobileShell (Student + Parent)

Phone-frame container:
- **Status bar** (top): time left, signal/battery right. 12px font, 12px/22px/4px padding.
- **Content area** (middle): flex column, overflow hidden.
- **Tab bar** (bottom, optional): text-only, no icons. 4 tabs max.
  - Student tabs: Today / Library / Streak / You
  - Parent tabs: Today / Progress / Notes / You
  - Active tab: ink-0 + 12px x 1.5px ink-0 underline centered
  - Inactive tab: ink-3, 11px, weight 500, tracking 0.04em

Width in prototype: 380px. Height: 780px.

### 4.2 DesktopChrome (Instructor + Admin)

Three-part layout:
- **Rail** (left, 200px): text-only nav with Wordmark at top, eyebrow section headers, nav items as `.hh-rail` divs. Active item has a 4px sage-deep dot. User avatar + name at bottom.
  - Instructor rail sections: Teaching (Today / Students / Assignments / Evaluations), Setup (Lesson categories), Library (Surahs / Reciters)
  - Admin rail sections: School (Overview / Instructors / Students / Parents), Admin (Invitations / Settings)
- **Top header**: 22px/36px padding, flex space-between. Left: Eyebrow + display title. Right: action buttons.
- **Main content**: scrollable, flex-grow.

Width in prototype: 1120px. Height: 720px.

---

## 5. Screen-by-Screen Implementation Notes

### 5.1 Landing Page (screens-auth.jsx: Landing)

Split layout: `grid-template-columns: 1.1fr 0.9fr`.

**Left column** (padding 44px 56px):
- Top: Wordmark + nav links (For schools / For families / Pricing / Sign in)
- Center: Eyebrow "A companion for the journey" then Display headline 56px:
  ```
  A quiet place
  *to memorize* the Quran,    <- "to memorize" in italic sage-deep
  together.
  ```
- Body: 14.5px, ink-1, max-width 380px
- CTAs: primary "Begin" (lg) + ghost "I have an invite code" (lg)
- Stats row: 2,400 students / 38 madaris / 14 reciters (ink-2 labels, ink-0 bold values)
- Footer: "Built with care - For your family or your madrasah"

**Right column** (paper-3 background, 1px rule-1 left border):
- Single ayah: Al-Fatihah verse 6, centered, 44px Arabic with tajweed
- Below: italic Newsreader translation, 15px
- Below that: uppercase "Al-Fatihah - Verse 6"

### 5.2 Sign-up -- Role Select (screens-auth.jsx: Signup)

Full-width paper-1. Wordmark top-left, "Already have an account? Sign in" top-right.

- Step indicator: Eyebrow "Step 1 of 2"
- Display headline 34px: "Who's joining today?"
- Body: 14px, ink-1

**Role cards**: 2x2 grid, gap 1px, background rule-1 (creates hairline grid). Each card:
- Title in Newsreader serif 19px
- Body text 12.5px ink-1
- Footer text 11px ink-2
- Selection indicator: 14px circle, hairline border, filled ink-0 when selected with check icon

Four roles with copy:
1. **Student** -- "I'm memorizing -- I want my lessons in one place." / "Join with an invite code from your teacher."
2. **Instructor** -- "I teach hifdh -- for a class, halaqah, or madrasah." / "You'll be able to invite up to 30 students."
3. **Parent** -- "My child is memorizing -- I'd like to follow along." / "We'll link you to your child's account."
4. **School admin** -- "I run a madrasah and oversee multiple instructors." / "Includes instructor & student management."

Bottom: step dots + primary "Continue" button.

### 5.3 Login (screens-auth.jsx: Login)

Split 50/50 layout.

**Left**: Wordmark, then centered form (max-width 340px):
- Eyebrow "Welcome back"
- Display 34px: "*As-salamu* alaykum." (italic on as-salamu)
- Subtitle: "Continue where you left off."
- Email input, Password input with "Forgot?" link
- Primary "Continue" button (lg, full-width centered)
- "or" divider with hairlines
- "Sign in with Google" button (lg, full-width centered)
- "New here? Create an account" link

**Right**: paper-3, Bismillah (verse 1:1) centered at 36px Arabic, italic translation below.

### 5.4 Instructor Dashboard / Roster (screens-instructor.jsx: InstructorDashboard)

DesktopChrome with InstructorRail (active: "students").

**Top header**: Eyebrow "Tuesday - 28 Shawwal 1446" + Display 24px "Today's halaqah". Right: search field (Cmd+K) + primary "New assignment" button.

**Content** (padding 32px 36px, max-width 920px):

Summary stats row (flex, gap 48px, border-bottom rule-1):
- Students: 8
- Submitted today: 2
- Needs review: 1 (fail color)
- Overdue: 1 (fail color)
- Class avg streak: 13d

Each stat: eyebrow label + display 24px value.

Roster table (overline "Roster" above):
- Columns: Student (34%) / Today's lesson (26%) / Streak (16%) / Juz' (14%) / Status (10%, right-aligned)
- Header: uppercase 11px, ink-2, tracked
- Rows: hairline top border, 16px padding, pointer cursor
- Student cell: Avatar 28px + name (13.5px weight 500) + grade (11px ink-2)
- Lesson cell: Newsreader serif 13px
- Streak cell: Streak dots + "Xd" label (11px ink-2)
- Juz cell: Newsreader serif + hh-num
- Status cell: Status component, right-aligned

Sorted by urgency: needs-review > overdue > due-today > submitted > in-progress.

### 5.5 Single Student (screens-instructor.jsx: InstructorStudent)

DesktopChrome. Breadcrumb: "< Roster / {name}". Actions: "Send note" + primary "Evaluate today".

**Header** (flex, gap 28px, border-bottom):
- Avatar 64px
- Name as display 38px, grade as eyebrow, current surah in italic serif 14px
- Right: streak as display 32px + "days" suffix + Streak dots

**Assigned today** (overline label):
- Bordered card (paper-2, 1px rule-1 border, 24px/28px padding)
- Three Lesson rows separated by hairline rules
- Each Lesson: 3-column grid (180px label / 1fr content / auto edit link)

**Recent evaluations** (overline label):
- Each eval: date column (80px) + body (status row + quoted note in italic Newsreader)

### 5.6 New Assignment (screens-instructor.jsx: NewAssignmentForm)

DesktopChrome. Breadcrumb: "< Assignments / New". Actions: ghost "Save draft" + primary "Send to N students".

**Form** (max-width 760px):
1. **Lesson type**: segmented buttons from teacher-defined categories
2. **Surah** select + **From/To verse** inputs (2-column grid)
3. **Preview card** (paper-3, centered): surah + sample Arabic in Amiri Quran 26px
4. **Reciter** select + **Repeat xN** slider (2-column grid)
5. **Send to** student picker (2-column grid with checkmarks)

### 5.7 Evaluate Panel (screens-instructor.jsx: EvaluatePanel)

DesktopChrome. 2-column: `grid-template-columns: 1fr 360px`.

**Left** (mushaf view): verses with tajweed + play bar + legend.
**Right** (form): grade per category (Pass/Partial/Redo segments) + corrections slider + family note textarea.

### 5.8 Lesson Categories Settings (screens-instructor.jsx: CategorySettings)

CRUD list of teacher-defined categories with inline-editable name/descriptor, reorder up/down, remove, add. Seeded with: New Lesson / Review / Group Review.

### 5.9 Student Dashboard (screens-student.jsx: StudentDashboard)

MobileShell. Greeting + streak card + today's lesson with primary CTA + secondary lessons + instructor note.

### 5.10 Quran Player (screens-student.jsx: QuranPlayer) -- THE CENTERPIECE

MobileShell, NO tab bar. Mushaf reading area with active/inactive verse opacity. Bottom transport with the only prominent UI element: 56px ink-0 filled play/pause circle.

### 5.11 Student Assignment Detail (screens-student.jsx: StudentAssignmentDetail)

MobileShell. Lesson rows per category + practice tally + submit CTA.

### 5.12 Parent Dashboard (screens-other.jsx: ParentDashboard)

MobileShell. Read-only streak + weekly summary rows + today's lesson + instructor note with "Reply" link.

### 5.13 Parent Notes Thread (screens-other.jsx: ParentAssignmentNotes)

MobileShell. Chat-like thread: paper-3 incoming, ink-0 outgoing. Newsreader serif. Compose bar with no icons.

### 5.14 Admin Dashboard (screens-other.jsx: AdminDashboard)

DesktopChrome. Stats + editorial sentence + halaqat table.

### 5.15 Admin Manage Instructors (screens-other.jsx: AdminInstructors)

DesktopChrome. Instructor table with status indicators.

---

## 6. Key Patterns to Reproduce

### Layout
- **Whitespace is the loudest element.** Remove stats before adding more padding.
- **One focal item per screen.** Landing = verse. Player = mushaf. Evaluate = recited ayat.
- **Hairlines, not boxes.** `border-top: 1px solid var(--rule-1)` between rows.
- **Tables over cards** for any list.
- **Flex/grid with gap.** Never inline-block siblings with margins.
- **No charts** beyond the 14-day streak dot row.

### Typography
- **Italic is structural** -- for inflection, never emphasis.
- **Eyebrow then Display** is the standard heading pattern.
- Instructor notes always in **italic Newsreader** with straight quotes.
- **Eastern Arabic numerals** for verse numbers in mushaf contexts only.

### Content / Copy
- Use proper Islamic transliterations with diacritics.
- Avoid "dashboard", "tracking", "metrics", "analytics".
- No anthropomorphizing. No emoji. Success = *alhamdulillah*.

### Things to AVOID
- Pure white, slate grey, neon green
- Drop shadows, blurred glass, gradients
- Pie charts, bar charts, donut rings
- Emoji, illustrative SVGs, decorative icons
- Photographic avatars
- Pills with backgrounds for status
- Cards within cards
- Anything that looks like an analytics dashboard

---

## 7. Production vs Prototype Differences

The prototype uses:
- React 18 via CDN + Babel in-browser transpilation -> production uses **Next.js**
- `window.HH` global data -> production uses **Supabase queries**
- Inline styles -> production should use **CSS modules or Tailwind** mapping to tokens
- `design-canvas.jsx` and `tweaks-panel.jsx` -> **not needed in production**
- All screens on pan/zoom canvas -> production uses **route-based navigation**

### What to keep verbatim
- All CSS custom properties from `tokens.css`
- All atomic component visual specs (sizes, colors, proportions)
- The icon SVG paths
- The Google Fonts URL and font stack
- The tajweed color mapping
- Layout proportions (rail 200px, padding values, max-widths)

### What to adapt
- Inline React styles -> proper CSS solution
- Hard-coded sample data -> Supabase data layer
- `window.HH.categories` -> database-backed teacher categories
- Static artboard sizes -> responsive layouts
- Prototype shells (MobileShell bezel, DesktopChrome) -> actual responsive viewport layouts

---

## 8. CSS Class Reference (from tokens.css)

```
.hh              — root reset (font, color, background, box-sizing)
.hh-serif        — Newsreader serif, weight 400
.hh-display      — Newsreader display (tighter tracking -0.022em, line-height 1.05)
.hh-eyebrow      — 10px uppercase tracked label
.hh-meta         — 11.5px ink-2 meta text
.hh-rule         — 1px hairline (use as <hr>)
.hh-btn          — base button (paper-2, hairline border, 8px/14px padding)
.hh-btn.primary  — ink-0 fill, paper-1 text
.hh-btn.ghost    — transparent, no border
.hh-btn.sage     — sage-deep fill
.hh-btn.sm       — smaller (5px/10px padding)
.hh-btn.lg       — larger (12px/22px padding)
.hh-input        — text input (paper-2, hairline border, focus -> ink-1 border)
.hh-status       — text + dot status indicator
.hh-status.pass/partial/fail/muted
.hh-arabic       — Arabic text block (Amiri Quran, RTL, line-height 2.1)
.hh-num          — tabular numerals
.hh-tab          — mobile tab bar item (text-only)
.hh-tab.active   — active tab with underline
.hh-overline     — label + extending hairline rule
.hh-rail         — desktop nav rail item
.hh-rail.active  — active with sage dot
.hh-row          — flex row helper
.hh-grow         — flex grow helper
.hh-truncate     — text overflow ellipsis
.hh-placeholder  — hatched placeholder block
```
