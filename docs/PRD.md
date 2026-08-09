# Product Requirements Document (PRD)

## Pishbin — AI Financial Decision Copilot for Iranian SMEs

### Overview
Pishbin brings together scattered financial data — invoices, checks, customer payment behavior, accounts, and cash — and shows the effect of today's decision on the next 30 days of cash flow, so the owner-operator of an Iranian SME doesn't have to be their own lonely CFO.

### Core features

#### 1. Authentication & security
- Register / login (JWT access + refresh tokens)
- Forgot-password / reset-password (email link with time-limited token)
- Two-factor authentication (TOTP): setup with QR, enable, disable, verify-at-login
- API keys for programmatic access (`pishbin_...`, stored as SHA-256 hash, usable via `X-API-Key` header)

#### 2. Account management
- Multiple account types (checking, savings, credit card, investment, loan, other)
- Balance tracking, create / edit / deactivate

#### 3. Transaction tracking
- Income, expense, and transfer transactions with categories
- Search, filtering (account, category, date range, amount range, free-text)
- Duplicate detection on create (warns with `409`, can be forced)
- CSV export and CSV import
- Recurring transactions (weekly / monthly / yearly templates) with a "run now" endpoint that creates due transactions and advances the schedule

#### 4. Budgets
- Budget by category, weekly / monthly / yearly period
- Spending vs. budget, alerts at high utilization (e.g. ≥80%)

#### 5. Financial goals
- Savings, debt payoff, purchase, emergency fund, and other goal types
- Progress tracking, target date, status lifecycle (active, completed, paused, cancelled)

#### 6. Banking message parsing
- Ingest raw bank SMS/push text, parse amount / date / description
- AI-assisted category suggestion based on amount and description
- One click to turn a parsed message into a transaction

#### 7. Payments (ZarinPal)
- Request → redirect → verify flow against the ZarinPal gateway (Iranian Rial)
- Payment history; record a completed payment as an income transaction

#### 8. Dashboard & reports
- Summary: total balance, income/expenses, active budgets/goals, recent transactions
- Founder Financial Command Center: KPIs, sparklines, burn-rate style overview
- Cash summary digest (last N days: cash in/out, net, top expense categories) for scheduled/weekly digests
- Reports: expenses by category, income vs. expenses trend, period-over-period spending insights

#### 9. Backup & data portability
- Export all user data (accounts, transactions, budgets, goals, recurring) as JSON
- Restore endpoint validates a backup file (full re-import is not yet implemented)

#### 10. Settings & personalization
- Profile edit (email, username, full name)
- Theme (light / dark / system), stored per-user (`pishbin-theme`)
- Configurable dashboard widgets (`dashboard_preferences` JSON on the user)

### Technical requirements

#### Backend
- FastAPI, Python 3.11+
- PostgreSQL via SQLAlchemy ORM
- Pydantic schemas for request/response validation
- JWT auth (`python-jose`), bcrypt password hashing (`passlib`), TOTP (`pyotp`)

#### Frontend
- Next.js 14+ (App Router) with TypeScript
- Tailwind CSS, fully Persian (RTL) UI
- Zod for form validation, Recharts for charts

### User stories
1. As an SME owner, I want to see my accounts, transactions, and upcoming recurring items in one place, so I know my current cash position.
2. As an SME owner, I want a forward-looking view of cash flow, so I can decide whether I can afford a purchase or need to chase a payment.
3. As an SME owner, I want to record a bank SMS as a transaction with one click, so I don't have to enter it manually.
4. As an SME owner, I want to accept online payments (ZarinPal) and reconcile them as income.
5. As a developer/integrator, I want an API key so I can pull my data programmatically.
6. As a security-conscious user, I want two-factor authentication on my account.

### Known gaps
- **Forecast is still mostly a simple historical average** (`backend/app/services/forecast_service.forecast_monthly_expenses`) — it projects the last 6 months' average monthly expense forward. Pending checks now contribute known-amount cash events (`get_upcoming_check_events`), but invoices and customer payment behavior are not yet wired in; the underlying model needs dedicated design/implementation work for a true cash-flow forecast.
- Backup **restore** only validates the uploaded file's schema/user match; it does not yet re-import data.
- Dedicated **invoice** tracking (the other data source named in the product positioning) is not yet modeled. Checks are now a first-class entity (`backend/app/models/check.py`) with issued/received direction, status (pending/cleared/bounced/voided), and a Sayad tracking number field — but the actual Sayad status-inquiry API integration is a future phase (currently manual status updates only).

### Success metrics
- Active accounts and recurring rules configured per user
- % of transactions created from parsed banking messages vs. manual entry
- Budget adherence rate; goal completion rate
- ZarinPal payment success rate
- Weekly digest open/engagement rate
