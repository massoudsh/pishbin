# Phase issues — copy to GitHub or use `gh issue create`

Use these to create issues (and optionally a milestone) for each phase.

---

## Milestone (optional)

Create milestone **Phase 1 — Foundation** (and later Phase 2–5).

---

## Issue 1: Phase 1 — Foundation (epic)

**Title:** `[Phase 1] Foundation — Branding, app shell, auth, landing`

**Labels:** `phase-1`, `epic`

**Body:**

### Goal
Establish Pishbin branding, app shell, auth flows, and a usable landing/dashboard.

### Tasks
- [ ] Ensure app name "Pishbin" and logo in layout, navbar, and metadata
- [ ] Login and register pages working with backend
- [ ] Dashboard (authenticated and guest mode) with consistent layout
- [ ] Responsive navbar and basic routing
- [ ] Optional: simple landing page for `/` before redirect to dashboard

### Done when
User can sign up, sign in, see dashboard with Pishbin branding, and navigate main sections.

### Ref
See `docs/PHASES.md` for full phase description.

---

## Issue 2: Pishbin branding and app shell

**Title:** `[Phase 1] Pishbin branding and app shell`

**Labels:** `phase-1`, `ui`

**Body:**

- Update all user-facing text and metadata to "Pishbin".
- Navbar: logo, "Pishbin" title, primary color consistent with Tailwind theme.
- Layout: title "Pishbin", description "Personal finance, simplified."
- Ensure `pishbin-frontend` in package.json and backend `APP_NAME` = "Pishbin API".

Parent: Phase 1 epic.

---

## Issue 3: Auth flows (login / register)

**Title:** `[Phase 1] Auth flows — login and register`

**Labels:** `phase-1`, `auth`

**Body:**

- Login and register pages must work with Pishbin API.
- Store tokens (e.g. access + refresh), handle 401 and redirect to login when needed.
- After login/register, redirect to dashboard.
- Show "Guest" when not authenticated and allow exploring dashboard in guest mode.

Parent: Phase 1 epic.

---

## Issue 4: Dashboard and guest mode

**Title:** `[Phase 1] Dashboard and guest mode`

**Labels:** `phase-1`, `ui`

**Body:**

- Dashboard shows summary (balance, income/expenses, recent transactions) when authenticated.
- Guest mode: show sample/demo data and CTA to sign up or sign in.
- Use shared layout (navbar) and loading states.

Parent: Phase 1 epic.
