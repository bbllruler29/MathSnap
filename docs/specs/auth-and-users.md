# Spec: Authentication & User Profiles

Covers: signup, login, session handling, the `public.users` profile row, role-based access, and the COPPA age-gate. Depends on `docs/specs/supabase-schema.sql` (tables/triggers already created).

---

## 1. Auth Provider Setup

- **Provider:** Supabase Auth.
- **Methods enabled:** Email/password, Google OAuth.
- **Supabase Dashboard config (manual, one-time):**
  - Authentication > Providers > Email: enabled, "Confirm email" ON.
  - Authentication > Providers > Google: enabled, OAuth client ID/secret configured in the Supabase Dashboard (not in app `.env` — Supabase handles the OAuth handshake).
  - Authentication > URL Configuration: Site URL = `NEXT_PUBLIC_APP_URL`; Redirect URLs include `${NEXT_PUBLIC_APP_URL}/auth/callback`.

## 2. Signup Flow

**Route:** `app/(auth)/signup/page.tsx`

1. Form fields: `email`, `password` (min 8 chars), `birth_year` (4-digit year select, required).
2. Client-side validation via Zod (`lib/validation/schemas.ts#signupSchema`).
3. **COPPA age-gate:** compute age from `birth_year`. If age < 13:
   - Block self-service signup. Show message: "MathSnap requires a parent or guardian to create the account for users under 13." with a link to a parent-signup variant of the same form (parent provides their own email/birth_year; same flow, no separate schema needed for MVP — the account is simply registered as an adult-owned account).
   - Do not call Supabase Auth in this case.
4. If age >= 13: call `supabase.auth.signUp({ email, password })`.
5. On success, the DB trigger `on_auth_user_created` (in `supabase-schema.sql`) inserts the `public.users` row automatically with `role='student'`, `subscription_tier='free'`.
6. Immediately after signup success, call `supabase.from('users').update({ birth_year }).eq('id', user.id)` to persist the birth year (not available to the trigger, which only has access to `auth.users`).
7. Redirect to `/verify-email` screen until the confirmation email is clicked; Supabase handles the confirmation link and redirects to `${NEXT_PUBLIC_APP_URL}/auth/callback`.

**Google OAuth signup:** `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: `${NEXT_PUBLIC_APP_URL}/auth/callback` } })`. Same `on_auth_user_created` trigger fires. Because OAuth provides no birth year, the user is redirected to a one-time `/onboarding/birth-year` screen before reaching `/app`, which PATCHes `users.birth_year`. Access to `/app` is blocked (middleware redirect) until `birth_year` is non-null.

## 3. Login Flow

**Route:** `app/(auth)/login/page.tsx`

1. Email/password form → `supabase.auth.signInWithPassword({ email, password })`.
2. Google button → same `signInWithOAuth` call as above.
3. On success, redirect to `/app`. On failure, show inline error: "Invalid email or password" (never reveal whether the email exists).

## 4. Session Handling

- Use `@supabase/ssr` package. `lib/supabase/client.ts` exports a browser client; `lib/supabase/server.ts` exports a server client that reads/writes the session cookie.
- `middleware.ts` at the project root:
  - Refreshes the Supabase session cookie on every request.
  - Redirects unauthenticated requests to `/login` for any path under `/app/*` or `/admin/*`.
  - Redirects authenticated requests whose `users.birth_year` is null (and auth method was OAuth) to `/onboarding/birth-year`, except for the onboarding route itself.
  - For `/admin/*`, additionally fetches `users.role` server-side; if not `'admin'`, redirect to `/app` (do not reveal the admin route exists via a 403 page).

## 5. Role Field

- `users.role` is `'student'` by default. There is no self-service path to become `'admin'` — admin accounts are provisioned by directly updating the row via the Supabase Dashboard or a one-off SQL statement run by an operator. No UI or API endpoint exists to change a user's own role (prevents privilege escalation).

## 6. Logout

- `supabase.auth.signOut()` client-side, then redirect to `/login`.

## 7. Edge Cases

| Case | Behavior |
|---|---|
| Signup with an email that already exists | Supabase returns an error; show "An account with this email already exists. Try logging in." |
| Birth year indicates under-13, user retries with a different (false) birth year | Out of scope for MVP — no identity verification; documented as an accepted limitation, not solved here. |
| OAuth user never completes `/onboarding/birth-year` | Middleware keeps redirecting them there on every request until completed; no access to `/app` features in the meantime. |
| Password reset | `supabase.auth.resetPasswordForEmail(email, { redirectTo: ... })`; standard Supabase flow, one dedicated `/reset-password` page. |
| Session expired mid-solve | API routes return `401`; frontend's shared fetch wrapper (`lib/api/client.ts`) catches `401` globally and redirects to `/login`, preserving the current path in a `redirect` query param to return after re-auth. |

## 8. Acceptance Criteria

- [ ] A new email/password signup with birth_year indicating age >= 13 creates both an `auth.users` and `public.users` row with `role='student'`, `subscription_tier='free'`.
- [ ] A signup attempt with age < 13 is blocked client-side before any Supabase Auth call is made.
- [ ] Google OAuth signup creates a profile row and forces `/onboarding/birth-year` before any `/app` route is reachable.
- [ ] `/admin/*` routes are unreachable (redirected) for any user whose `role != 'admin'`.
- [ ] Logging out clears the session and blocks access to `/app/*` until re-authenticated.
