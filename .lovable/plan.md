## Goal

Add a warm, motivational **Welcome page** that appears right after a user signs in (or signs up) — before they're dropped into their dashboard. It should celebrate their return, encourage them to aim for great results, and feel on-brand with the "clean academic" navy + gold design.

## UX Flow

1. User signs in / signs up on `/auth`.
2. Instead of redirecting straight to `/app/student` (or whichever role dashboard), they go to **`/welcome`**.
3. `/welcome` shows a personalized hero ("Welcome back, *FirstName* 👋"), an encouraging message, a rotating inspirational quote, and a few quick "what you can do today" cards tailored to their role.
4. A primary **"Continue to my dashboard →"** button takes them to the correct role dashboard.
5. After the first visit per session, subsequent logins still show it (it's a positive ritual, not a blocker). Users can click straight through in one tap.

## What I'll build

### 1. New route: `src/routes/welcome.tsx`
- Auth-guarded (redirects to `/auth` if not signed in).
- Uses `useAuth()` to read the user's name + role.
- Beautiful full-screen layout with the navy gradient hero background already in the design system.
- Sections:
  - **Personalized greeting** with first name from `user_metadata.full_name`, time-of-day aware ("Good morning / afternoon / evening").
  - **Motivational headline** — e.g. *"Every great result starts with a single decision: to show up today."*
  - **Rotating quote card** — picks one of ~8 curated quotes about education, perseverance, and excellence (Chinua Achebe, Nelson Mandela, Wole Soyinka, Malala, etc. — Africa-forward voices alongside classics).
  - **Role-aware "Today you can…" trio** of small cards:
    - Student: *Check your results · Enrol in courses · Add a parent contact*
    - Lecturer: *Upload results · Manage your courses · Post an announcement*
    - Admin: *Approve pending results · Manage users · Send notifications*
    - Parent: *View your child's results · Read announcements · Update profile*
  - **Primary CTA button**: "Continue to my dashboard →" (navigates via `dashboardPathFor(role)`).
  - **Subtle secondary line**: "Tip: Bookmark your dashboard for quick access."
- Includes a small `head()` with title `"Welcome — EduLink Nigeria"`.

### 2. Update redirect target in `src/routes/auth.tsx`
- Change the post-auth redirect from `dashboardPathFor(role)` → `/welcome` (preserving the `redirect` search param if it was set, so deep-links still work — those bypass `/welcome`).

### 3. Polish
- Subtle entrance animations (fade-up on heading, staggered cards) using existing Tailwind utilities — no new deps.
- Mobile-first layout (single column on small screens, 3-up cards on `md+`).
- Respects the existing design tokens (navy primary, gold accent, Playfair serif headings, Inter body).

## Files

- **Create**: `src/routes/welcome.tsx`
- **Edit**: `src/routes/auth.tsx` (one-line redirect change)

## Out of scope

- No DB changes, no new packages, no edge functions.
- No "skip welcome screen" preference — keeping it simple; can be added later if you want.

Ready to build when you approve.