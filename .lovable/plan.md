## Goal

Guardians become first-class citizens. Every student must register a guardian with a real email address, that guardian gets a login that's automatically linked to the student, and the moment a result is admin-approved every linked guardian receives an email (plus the existing SMS hook).

## How student ↔ parent are joined

Today `parent_links` already has a `parent_user_id` column that's left empty. We'll use it as the join key:

1. At signup, the student supplies guardian name + phone + **email (required)** + relationship.
2. The trigger creates the `parent_links` row with `parent_email` filled in but `parent_user_id` still `NULL` (the parent hasn't signed up yet).
3. Whenever any user signs up (or signs in) with the role `parent`, a database trigger looks at `auth.users.email` and back-fills `parent_user_id` on every `parent_links` row whose `parent_email` matches. From that moment the parent's dashboard sees the student.
4. Result: students never need a "share code" and parents never need to know a matric number — the email address is the link.

```text
   Student signs up                Parent signs up later
   ───────────────                 ─────────────────────
   parent_links row created   ──►  trigger matches email  ──►  parent_user_id filled
   parent_email = mum@x.com        auth.users.email = mum@x.com    parent sees child
```

## Changes

### 1. Signup form (`src/routes/auth.tsx`)
- Make `parent1Email` **required** + valid email; same rule for `parent2Email` if a second guardian is added.
- Update helper text: "Your guardian will use this email to sign in and receive your results."

### 2. Database migration
- Make `parent_links.parent_email` `NOT NULL`.
- New trigger `link_parent_on_signup` on `auth.users` (AFTER INSERT/UPDATE of email) that runs:
  ```sql
  UPDATE public.parent_links
     SET parent_user_id = NEW.id
   WHERE parent_user_id IS NULL
     AND lower(parent_email) = lower(NEW.email);
  ```
- New RLS policy on `profiles`: a parent can read the profile of any student they're linked to (so the parent dashboard can show the child's name, matric, department).
- New trigger `notify_parents_on_result_approval` on `public.results`:
  - Fires when `status` transitions to `admin_approved`.
  - Inserts one row per linked guardian into a new `email_outbox` table with template + payload (student name, course, grade, session, semester).
  - Also inserts into the existing `notification_log` (channel `email`) so the admin Notification Center shows it.
- New table `public.email_outbox` — simple queue with columns `id, to_email, subject, body_html, body_text, status (pending|sent|failed), attempts, last_error, created_at, sent_at`. RLS: service-role only.

### 3. Outbox processor (server function)
- New file `src/server/email.functions.ts` exporting `processEmailOutbox` (createServerFn).
- It pulls up to 20 `pending` rows, sends each via Lovable Email (built-in transactional email infrastructure — no third-party API key needed), marks `sent` or increments `attempts`.
- Triggered two ways:
  - Automatically called by the admin "Notifications" page on load.
  - A small "Send pending result emails" button in the admin dashboard so anyone can drain the queue manually.

  (We're not adding pg_cron here because Lovable's email infra adds its own queue worker once we scaffold it — see step 6.)

### 4. Parent dashboard (`src/routes/app.parent.index.tsx` — new)
- Lists every linked student (full name, matric, department, level).
- For each child, shows the latest **approved** results grouped by session/semester, plus current CGPA — reusing `computeGPA` and `gradeColor` from `src/lib/grades.ts`.
- Empty state when no link exists yet: "We haven't matched you to a student yet. Ask your child to confirm the email they registered for you is `<your email>`."

### 5. Parent results route (`src/routes/app.parent.results.$studentId.tsx` — new)
- Detail view for one child's results — same layout as the student's own results page, but read-only and scoped to that student via the existing `results_parent_read_approved` policy.

### 6. Email infrastructure setup
- Run `setup_email_infra` and `scaffold_transactional_email` so we get the proper sending pipeline, suppression handling, and the `send-transactional-email` server route.
- Create one React Email template `result-published.tsx` (guardian-facing: child's name, course, grade, session, link to log in).
- The outbox processor calls the scaffolded send route instead of doing its own HTTP — cleaner and benefits from the built-in retry/queue.

### 7. Nav + small UI tweaks
- `AppShell` parent nav already has a Dashboard link; add "My Children" pointing to `/app/parent`.
- Student courses/parents pages already say "Only admin can change this" — no further changes.

## Prerequisite: email sender domain
Lovable Email needs a verified sender domain before it can deliver real emails to guardians. The project doesn't have one configured yet. After you approve the plan, the very first step is to walk you through hooking up a domain (one click in the Cloud → Emails dialog). Once that's in place, everything else runs automatically.

## Out of scope (for this round)
- No SMS changes — the existing mock SMS path keeps working and will fire alongside the new email when admins use the Notification Center.
- No parent-initiated "claim my child" flow — email match is sufficient and matches how school portals already work.
- No editing of guardian info on the parent side; only admins edit (per earlier decision).

<lov-actions>
<lov-open-email-setup>Set up email domain</lov-open-email-setup>
</lov-actions>