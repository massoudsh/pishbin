# Pishbin — Documentation

Open, plain-Markdown knowledge base for the Pishbin codebase. No proprietary tooling required — every doc here renders on GitHub as-is.

## Start here

| Doc | What it covers |
|---|---|
| [PRD.md](PRD.md) | Product scope, features, user stories, known gaps |
| [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) | Three-tier architecture, layers, data flow, security |
| [ARCHITECTURE_DIAGRAMS.md](ARCHITECTURE_DIAGRAMS.md) | Mermaid diagrams: components, data lineage, class structure, sequences |
| [DB_DESIGN.md](DB_DESIGN.md) | Full table-by-table schema (10 tables), relationships, indexes |
| [API_SPEC.md](API_SPEC.md) | Every REST endpoint, request/response shapes, status codes |
| [USER_FLOWS.md](USER_FLOWS.md) | Swimlane-style user journeys (add transaction, budgets, goals, auth) |
| [PHASES.md](PHASES.md) | Development phases and current state |
| [FEATURES_ZOOMOUT.md](FEATURES_ZOOMOUT.md) | Feature dependency map and implementation order |
| [DEPLOYMENT.md](DEPLOYMENT.md) | Production deployment: env vars, migrations, Docker, health checks |
| [PRISMA_SETUP.md](PRISMA_SETUP.md) | Frontend's secondary Prisma + Postgres mock-data layer |
| [github-repo-descriptions.md](github-repo-descriptions.md) | GitHub repo About text / topics |

## Quick facts

- **Backend:** FastAPI + SQLAlchemy + PostgreSQL, Python 3.11+ (`backend/`)
- **Frontend:** Next.js 14+ (App Router) + TypeScript + Tailwind, fully Persian/RTL (`frontend/`)
- **Domain model:** users, accounts, categories, transactions, budgets, goals, banking messages, ZarinPal payments, recurring transactions, API keys — see [DB_DESIGN.md](DB_DESIGN.md)
- **Auth:** JWT (access + refresh), optional TOTP 2FA, or API keys (`X-API-Key`)
- **Known limitation:** the "cash-flow forecast" is currently a simple historical-average projection (`backend/app/services/forecast_service.py`), not a full invoice/check-driven model — see the *Known gaps* section in [PRD.md](PRD.md)

## Conventions
- Docs are plain GitHub-flavored Markdown; diagrams use [Mermaid](https://mermaid.js.org/) so they render natively on GitHub.
- Keep docs in sync with the code they describe — when a model, endpoint, or flow changes, update the matching doc in the same change.
