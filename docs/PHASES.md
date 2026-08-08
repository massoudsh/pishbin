# Pishbin — Phased Development

Development is organized in phases. Each phase is tracked via GitHub issues and milestones.

**Issues:** [GitHub Issues](https://github.com/massoudsh/pishbin/issues)

## Phases overview

| Phase | Focus | Status |
|-------|--------|--------|
| **1** | Foundation — Branding, app shell, auth, landing | Done |
| **2** | Core data — Accounts & transactions CRUD | Done |
| **3** | Budgets & goals — Budget and goal management | Done |
| **4** | Reports & analytics — Charts, reports, export | Done |
| **5** | Polish & deploy — Settings, themes, performance, deployment | In progress |

## Current state

- **Auth:** Login, register, JWT refresh, forgot-password (reset token + email link flow), reset-password, password policy.
- **Core:** Accounts, transactions, categories, budgets, goals; dashboard with summary, charts, quick actions; banking messages (parse SMS → suggest category → create transaction).
- **Payments:** ZarinPal gateway (request → redirect → verify), payment history.
- **Settings:** Profile view/edit (email, username, full name), theme (light/dark/system), logout.
- **Deploy:** Dark mode, deployment docs (`docs/DEPLOYMENT.md`), Docker Compose prod, CORS and env examples. CI/CD and production checklist can be added as needed.

## Phase 1 — Foundation

- **Goal:** Pishbin branding, app shell, auth flows, and a usable landing/dashboard shell.
- **Scope:** App name "Pishbin" and logo; login and register; dashboard (authenticated and guest mode); responsive navbar and routing.
- **Done when:** User can sign up, sign in, see dashboard with Pishbin branding, and navigate main sections.

## Phase 2 — Core data

- **Goal:** Full accounts and transactions management.
- **Scope:** Accounts and transactions CRUD; categories and linking to backend APIs.
- **Done when:** Users can manage accounts and transactions end-to-end.

## Phase 3 — Budgets & goals

- **Goal:** Budget and goal management with progress.
- **Scope:** Budgets CRUD and spending vs budget display; goals CRUD and progress tracking.
- **Done when:** Users can set budgets, track spending, and manage savings goals.

## Phase 4 — Reports & analytics

- **Goal:** Reports and visual analytics.
- **Scope:** Expense by category, income vs expenses, time-range filters; export (CSV) and print-friendly views.
- **Done when:** Users can view and export key reports.

## Phase 5 — Polish & deploy

- **Goal:** Production-ready app and deployment.
- **Scope:** Settings page (profile, preferences, theme); dark/light theme; CI/CD; deployment (e.g. Vercel + Railway); docs.
- **Done when:** App is deployed and documented for production use.
