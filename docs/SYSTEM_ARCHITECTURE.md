# System Architecture

## Overview
Pishbin follows a three-tier architecture: Frontend (Next.js), Backend (FastAPI), and Database (PostgreSQL).

## Architecture diagram

```
┌─────────────────┐
│   Next.js App   │
│   (Frontend)    │
└────────┬────────┘
         │ HTTP/REST
         │
┌────────▼────────┐
│   FastAPI API   │
│   (Backend)     │
└────────┬────────┘
         │ SQL
         │
┌────────▼────────┐
│   PostgreSQL    │
│   (Database)    │
└─────────────────┘
```

See [`ARCHITECTURE_DIAGRAMS.md`](ARCHITECTURE_DIAGRAMS.md) for detailed Mermaid diagrams (component, data lineage, class, sequence).

## Components

### Frontend (Next.js)
- **Framework**: Next.js 14+ with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS, Persian (RTL) UI
- **API client**: Fetch API with custom wrapper
- **Validation**: Zod schemas
- **Charts**: Recharts
- **Prisma**: used separately in the frontend for a mock/seed data layer — see [`PRISMA_SETUP.md`](PRISMA_SETUP.md). The FastAPI + SQLAlchemy backend remains the source of truth for the real app.

### Backend (FastAPI)
- **Framework**: FastAPI
- **Language**: Python 3.11+
- **ORM**: SQLAlchemy
- **Validation**: Pydantic
- **Authentication**: JWT (`python-jose`) + optional TOTP 2FA (`pyotp`) + API keys
- **Password hashing**: bcrypt (`passlib`)
- **Database**: PostgreSQL

### Database
- **Type**: PostgreSQL 15+
- **ORM**: SQLAlchemy
- **Migrations**: Alembic (see [`DEPLOYMENT.md`](DEPLOYMENT.md))

## Layer structure

### Backend layers

1. **API layer** (`backend/app/api/v1/`) — one router module per domain: `auth`, `api_keys`, `accounts`, `categories`, `transactions`, `budgets`, `goals`, `alerts`, `dashboard`, `reports`, `banking_messages`, `payments`, `recurring`, `backup`. Wired up in `backend/app/api/router.py`.
2. **Service layer** (`backend/app/services/`) — business logic: `accounts_service`, `transactions_service`, `budget_service`, `goals_service`, `banking_message_service`, `zarinpal_service`, `forecast_service`, `reports_service`, `metrics_service`, `alerts_service`.
3. **Model layer** (`backend/app/models/`) — SQLAlchemy models: `User`, `Account`, `Category`, `Transaction`, `Budget`, `Goal`, `BankingMessage`, `Payment`, `RecurringTransaction`, `ApiKey`. See [`DB_DESIGN.md`](DB_DESIGN.md).
4. **Schema layer** (`backend/app/schemas/`) — Pydantic request/response models, one module per domain.

### Frontend layers

1. **Pages** (`frontend/app/`) — route handlers, page components, server/client components. 20+ routes: landing, login/register/forgot-password/reset-password, onboarding, connect-bank, dashboard, accounts, transactions, budgets, goals, investors, banking-messages, payments, recurring, reports, settings, help.
2. **Components** (`frontend/components/`) — reusable UI, layout, form, and chart components.
3. **Lib** (`frontend/lib/`) — API client, Persian copy (`fa.ts`), utilities.
4. **Prisma** (`frontend/prisma/`) — schema + seed for a secondary, mock-data-only database (see above).

## Data flow

1. User interacts with the frontend.
2. Frontend makes an API request to the backend (`NEXT_PUBLIC_API_URL`).
3. Backend validates the request (Pydantic schema).
4. Backend checks authentication (JWT bearer token, or `X-API-Key` for programmatic access).
5. Backend executes business logic (service layer).
6. Backend queries the database (model layer, SQLAlchemy).
7. Backend formats the response (schema layer).
8. Frontend receives and displays data.

## Security
- JWT access + refresh tokens; TOTP-based 2FA as an optional second factor at login
- API keys as a bearer-token alternative for programmatic/integration use, stored only as a hash
- Password hashing with bcrypt
- CORS configuration (`CORS_ORIGINS`)
- Input validation at API and schema levels
- SQL injection prevention via the ORM
- Environment variables for secrets (`SECRET_KEY`, `DATABASE_URL`, ZarinPal merchant ID, etc.)

## Deployment

### Development
- Backend: `uvicorn app.main:app --reload`
- Frontend: `npm run dev`
- Database: Local PostgreSQL or Docker (`docker-compose.yml`)

### Production
See [`DEPLOYMENT.md`](DEPLOYMENT.md) for the full checklist (env vars, Alembic migrations, Docker prod override, health check, CORS, frontend/backend hosting).

## Scalability considerations
- Database connection pooling
- API rate limiting (not yet implemented)
- Caching layer (Redis) — future
- Background jobs for recurring-transaction processing and scheduled digests — currently exposed as an on-demand endpoint (`POST /recurring/run-now`), not a background scheduler
- CDN for static assets — future
