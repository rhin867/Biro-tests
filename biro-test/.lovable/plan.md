- Plan: Test Creation Password, Public Tests, Leaderboards

### 1. Test Creation Password Gate

- Default password: `1@n2@e`, stored in DB table `app_settings` (key/value) so it's global across all users/devices.
- Add password prompt modal on `CreateTest.tsx` entry. On correct entry, store unlock in localStorage with expiry timestamp.
- Owner Admin Panel: new "Test Creation Password" card showing current password, input to set new password + expiry duration (years / months / days / hours / minutes / seconds inputs). Save writes new password + `expires_at` to `app_settings`.
- When expiry passes, users must enter password again. Owner can also set "never expires".

### 2. Owner Panel Password Management

- Admin Panel already uses two passwords (4918, 555911). Add a "Change Owner Passwords" section letting the owner update either one (saved to `app_settings` table, so change persists). First load falls back to hardcoded defaults if not set.

### 3. Public Tests

- New DB table `public_tests` (test data, owner_user_id, optional password_hash, attempts_count, created_at).
- In `MyTests.tsx` dropdown: add "Make Public" action. Dialog asks for optional password. Publishes test to `public_tests`.
- New page `/public-tests` ("Public Tests" panel) listing all public tests with: name, subjects, attempts count, password-lock badge. Click → if password set, prompt; on success, copy test locally and open exam.
- Sidebar nav link added.

### 4. Leaderboard per Test

- New DB table `test_leaderboard` (test_id, user_id, display_name, score, accuracy, time_taken, submitted_at).
- On test submission (existing `ExamInterface` finalize), insert row keyed by current user/profile.
- In `TestAnalysis.tsx`: add Leaderboard section showing ranked list (rank, name, score, accuracy, time). Highlight current user.
- Show "X people have attempted this test" badge on top of exam page and analysis page (count from leaderboard rows).

### 5. Leaked Password Protection

- Enable HIBP via `configure_auth` (`password_hibp_enabled: true`).

### Technical Section

**New tables (migration):**

- `app_settings(key text primary key, value jsonb, updated_at)` — read by anon, write by service_role only. Used for: `test_creation_password`, `test_creation_password_expires_at`, `admin_password_1`, `admin_password_2`. Owner UI writes via edge function using service role.
- `public_tests(id uuid pk, test_data jsonb, owner_id uuid, password_hash text null, attempts_count int default 0, created_at)` — select for anon+authenticated; insert for authenticated; update attempts via RPC.
- `test_leaderboard(id uuid pk, test_id text, user_id uuid, display_name text, score numeric, max_score numeric, accuracy numeric, time_taken int, submitted_at)` — select public; insert authenticated.

**Edge function `update-app-settings`:** verifies caller knows current admin passwords, writes to `app_settings` with service role.

**Files to add/modify:**

- New: `src/pages/PublicTests.tsx`, `src/components/exam/TestCreationGate.tsx`, `src/components/analysis/Leaderboard.tsx`, `supabase/functions/update-app-settings/index.ts`.
- Edit: `AdminPanel.tsx` (password mgmt + expiry inputs), `CreateTest.tsx` (gate), `MyTests.tsx` (Make Public action), `ExamInterface.tsx` (submit → leaderboard insert), `TestAnalysis.tsx` (Leaderboard + attempts count), `Sidebar.tsx`, `App.tsx` (route).

### Notes

- Only items above will be touched. Previously-shipped features (Biro-Brain, manual crop, community realtime, Telegram/Biro-Log links, image answer upload, full analysis PDF, etc.) are already in place from earlier turns — I will NOT redo them. If any are still buggy after this, tell me which one and I'll address it in a follow-up.

&nbsp;

it is not giving diagram(image/direct page of pdf link etc) in que palete for diagrams type of que so fix it also