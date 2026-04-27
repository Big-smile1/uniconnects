## Why the department dropdown spins forever

The signup form fetches departments **before the user is signed in**, but the current RLS policy on `departments` only allows the `authenticated` role to read rows:

```
departments_read_authenticated  →  roles: {authenticated}
```

So the anon request at `/auth` returns an empty array (status 200, body `[]`) — not an error. The Select component keeps showing **"Loading departments…"** because its loading state is driven by `departments.length === 0`, which never changes.

You can confirm this in the network log: the `/rest/v1/departments` call from the auth page came back with `Response Body: []` even though the database has 21 rows (Computer Science, Nursing, Geosciences, etc.).

There's also a small data hygiene issue: **"Mass Communication" is duplicated** (codes `MAC` and `MCM`). I'll clean that up while we're in there.

## Fix

### 1. Database migration
- Add a new RLS policy `departments_read_public` on `public.departments` allowing **anon + authenticated** to `SELECT` (read-only). Department names are not sensitive — they're literally the list a prospective student needs to register.
- Remove the duplicate `Mass Communication (MCM)` row, keeping `MAC`.
- Keep the existing `departments_admin_all` policy untouched so only admins can insert/update/delete.

### 2. Frontend resilience (`src/routes/auth.tsx`)
Improve the signup form so a future hiccup is visible instead of silent:
- Track an explicit `departmentsLoading` boolean and a `departmentsError` state.
- Show "Loading departments…" only while actually loading; if the fetch fails or returns empty after loading, show a clear "Couldn't load departments — please refresh" message with a retry button.
- Disable the "Create account" button until departments are loaded (prevents submitting with an empty department).

### 3. No changes needed elsewhere
- `app.profile.tsx` already runs after sign-in, so its department fetch keeps working through the existing authenticated policy.
- The `handle_new_user` trigger and other policies are unaffected.

## Outcome
- Department dropdown populates instantly on the signup page (21 real MTU departments, deduped).
- If anything ever goes wrong again, the UI surfaces it instead of spinning forever.