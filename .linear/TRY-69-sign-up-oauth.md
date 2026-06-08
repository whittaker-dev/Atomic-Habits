## Goal

**Sign Up** — new users register via **OAuth only** (Google, GitHub, Twitter). No email/password form.

**Parent:** TRY-16 · **Linear:** TRY-69 · **Epic step:** 10a · **Docs:** `docs/app-flow-and-business-logic.md` §16

**Related:** TRY-43 (superseded) · **Blocked by:** OAuth backend ticket

---

## Scope

### OAuth providers (required)

| Provider | Notes |
| -------- | ----- |
| Google   | OAuth 2.0 |
| GitHub   | OAuth App |
| Twitter  | OAuth 2.0 (X) |

**Out of scope:** Email + password registration, magic link, phone OTP.

### Backend (`apps/api`)

- [ ] Prisma: `Account` (provider, providerAccountId, userId) + link to `User`
- [ ] OAuth routes per provider: `GET /auth/:provider` → redirect; `GET /auth/:provider/callback` → session
- [ ] On **first** OAuth login: create `User` (email, name, avatar from provider profile)
- [ ] Seed default missions on signup (TRY-59): English, Fitness, Work
- [ ] HTTP-only session cookie (`SESSION_SECRET`); secure + sameSite in production
- [ ] Env: `GOOGLE_*`, `GITHUB_*`, `TWITTER_*`, `WEB_ORIGIN`, `API_URL`

Suggested libraries: Passport.js strategies or `@auth/express` — pick one and document in PR.

### Frontend (`apps/web`)

- [ ] Page: `/register` (Sign Up)
- [ ] Three provider buttons only — Google, GitHub, Twitter (brand icons + labels)
- [ ] i18n EN + VI for headings, CTAs, errors
- [ ] Link to Sign In: “Already have an account?”
- [ ] Match design system (dark canvas, Spotify green CTAs)
- [ ] Redirect to dashboard (or onboarding) after successful signup

---

## UX

```
/register
  Sign up for Atomic Habits
  [ Continue with Google  ]
  [ Continue with GitHub  ]
  [ Continue with Twitter ]
  Already have an account? Sign in
```

No email or password fields.

---

## Acceptance criteria

- [ ] User can sign up with each of the 3 providers
- [ ] New user row in DB + default missions seeded
- [ ] Session cookie set; refresh keeps user logged in
- [ ] No email/password UI or API on register flow
- [ ] OAuth errors show friendly message (cancelled, denied, server error)

---

## Env vars (`.env.example`)

```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
TWITTER_CLIENT_ID=
TWITTER_CLIENT_SECRET=
SESSION_SECRET=
WEB_ORIGIN=
API_URL=
```

---

## Estimate

**5** · **Priority:** High · **Phase:** 3 Frontend & MVP
