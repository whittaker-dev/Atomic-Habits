## Goal

**Sign In** — returning users log in via **OAuth only** (Google, GitHub, Twitter). No email/password form.

**Parent:** TRY-16 · **Linear:** TRY-70 · **Epic step:** 10b · **Docs:** `docs/app-flow-and-business-logic.md` §16

**Blocked by:** TRY-69

---

## Scope

### Backend (reuse Sign Up OAuth infra)

- [ ] Same OAuth routes handle returning users (find existing `Account` / `User`)
- [ ] `POST /auth/logout` — destroy session, clear cookie
- [ ] `GET /auth/me` — current user for SSR/client hydration (optional but recommended)

**Out of scope:** Email + password login, forgot password, email verification.

### Frontend (`apps/web`)

- [ ] Page: `/login` (Sign In)
- [ ] Three provider buttons — Google, GitHub, Twitter (same components as Sign Up)
- [ ] i18n EN + VI
- [ ] Link to Sign Up: “Don’t have an account?”
- [ ] Wire nav **Sign In** / **Get Started** buttons → `/login` and `/register`
- [ ] Redirect to dashboard after login
- [ ] Redirect logged-in users away from `/login` and `/register` → dashboard

### Route protection

- [ ] Middleware or layout guard: dashboard routes require session
- [ ] Unauthenticated → redirect to `/login`

---

## UX

```
/login
  Welcome back
  [ Continue with Google  ]
  [ Continue with GitHub  ]
  [ Continue with Twitter ]
  Don't have an account? Sign up
```

No email or password fields.

---

## Acceptance criteria

- [ ] Returning user can sign in with any linked provider
- [ ] Logout clears session; protected pages redirect to login
- [ ] Session persists on browser refresh
- [ ] Nav Sign In / Get Started link to auth pages
- [ ] No email/password UI or API on login flow

---

## Estimate

**3** · **Priority:** High · **Phase:** 3 Frontend & MVP
