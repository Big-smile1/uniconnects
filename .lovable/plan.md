## Goal
Let admins permanently delete user accounts from the Users admin page (`/admin/users`).

## Changes

### 1. Server: add `deleteUser` server function
- **`src/server/admin.server.ts`**: add `adminDeleteUser(userId)` that:
  - Refuses if `userId === callerId` (no self-delete).
  - Calls `sb.auth.admin.deleteUser(userId)` (service-role). The cascade on `auth.users` will clean `user_roles`, `profiles` (FK with `on delete cascade` exists for user_roles; profiles has no FK but uses same `id`, so we explicitly delete the `profiles` row first to avoid orphans, plus `parent_links` rows where `parent_user_id = userId` get nulled — keep simple: delete profile row, let other tables retain historical data).
- **`src/server/admin.functions.ts`**: export `deleteUser` server fn (POST), zod-validated `{ userId: uuid }`, guarded by `assertCallerIsAdmin`, also rejects self-delete.

### 2. UI: delete action in users table
- **`src/routes/admin.users.tsx`**:
  - Add a "Delete" button (trash icon, destructive ghost) in the Actions column next to "Reset password".
  - Hide/disable the button for the current admin's own row.
  - Open an `AlertDialog` confirming "Permanently delete {full_name}? This cannot be undone." with typed-confirmation-free simple confirm.
  - On confirm, call `deleteUser({ data: { userId } })`, toast success/error, reload list.

### 3. No DB migration needed
- `auth.users` deletion handles auth side; `user_roles.user_id` already has `on delete cascade`. Profile row is removed explicitly in the handler.

## Notes
- Deletion is irreversible; historical data referencing the user (results, announcements posted_by, etc.) remains with a now-dangling user id — acceptable for an academic record system where audit history matters. We do not cascade-delete results.
- Self-delete blocked server-side and client-side.
