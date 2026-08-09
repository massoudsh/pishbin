# API Specification

## Base URL
`http://localhost:8000/api/v1`

## Authentication
All endpoints except `/auth/register`, `/auth/login`, `/auth/refresh`, `/auth/forgot-password`, `/auth/reset-password`, `/auth/2fa/verify-login`, and the ZarinPal callback require authentication.

```
Authorization: Bearer <access_token>
```

Alternatively, programmatic clients can authenticate with an API key:

```
X-API-Key: pishbin_<key>
```

## Endpoints

### Authentication (`/auth`)

#### Register
- **POST** `/auth/register`
- **Body:**
```json
{
  "email": "user@example.com",
  "username": "username",
  "password": "password123",
  "full_name": "Full Name"
}
```

#### Login
- **POST** `/auth/login`
- **Body:** (form-data) `username`, `password`
- **Response (no 2FA):**
```json
{ "access_token": "token", "refresh_token": "token", "token_type": "bearer" }
```
- **Response (2FA enabled):**
```json
{ "requires_2fa": true, "temp_token": "token" }
```

#### Refresh token
- **POST** `/auth/refresh` — body: `{ "refresh_token": "token" }`

#### Current user
- **GET** `/auth/me`
- **PATCH** `/auth/me` — partial update: `email`, `username`, `full_name`, `dashboard_preferences`

#### Password reset
- **POST** `/auth/forgot-password` — body: `{ "email": "..." }`. Always returns success; sends a reset link by email if the account exists.
- **POST** `/auth/reset-password` — body: `{ "token": "...", "new_password": "..." }`

#### Two-factor authentication
- **GET** `/auth/2fa/setup` — returns `{ secret, provisioning_uri }` for a QR code
- **POST** `/auth/2fa/enable` — body: `{ secret, code }`
- **POST** `/auth/2fa/disable` — body: `{ password }`
- **POST** `/auth/2fa/verify-login` — body: `{ temp_token, code }` → returns real tokens

### API keys (`/api-keys`)
- **GET** `/api-keys` — list current user's keys (no secrets)
- **POST** `/api-keys` — body: `{ "name": "CI key" }`; response includes the plaintext key **once**: `{ id, name, key }`
- **DELETE** `/api-keys/{key_id}` — revoke

### Businesses (`/businesses`)
Multi-business/multi-branch workspaces. Every user gets one default business automatically on register. Accounts always belong to a business.
- **GET** `/businesses` — list current user's businesses
- **GET** `/businesses/{id}`
- **POST** `/businesses` — body: `{ name, description }`. The user's first business is automatically the default.
- **PUT** `/businesses/{id}` — partial update
- **POST** `/businesses/{id}/set-default` — switch the active/default business
- **DELETE** `/businesses/{id}` — `400` if it's the user's only business or still has accounts

### Accounts (`/accounts`)
- **GET** `/accounts?business_id=&skip=0&limit=100` — optionally filter by business
- **GET** `/accounts/{id}`
- **POST** `/accounts` — body: `{ business_id, name, account_type, balance, currency, description }`. `404` if `business_id` doesn't belong to the current user.
- **PUT** `/accounts/{id}` — partial update
- **DELETE** `/accounts/{id}`

### Categories (`/categories`)
- **GET** `/categories` — list all
- **POST** `/categories` — body: `{ name, description, color, icon }`. `400` if the name already exists.
- **PUT** `/categories/{id}` — partial update

### Transactions (`/transactions`)
- **GET** `/transactions?skip=0&limit=100&account_id=&category_id=&start_date=&end_date=&q=&amount_min=&amount_max=`
- **GET** `/transactions/{id}`
- **POST** `/transactions?force=false` — body:
```json
{
  "account_id": 1,
  "category_id": 2,
  "amount": 50.00,
  "transaction_type": "expense",
  "description": "Grocery shopping",
  "date": "2024-01-15T10:00:00Z",
  "notes": "Weekly groceries"
}
```
  Returns `409` with `{ "detail": { "code": "possible_duplicate", "existing_id", "existing_date" } }` if a likely duplicate is found; pass `?force=true` to create anyway.
- **PUT** `/transactions/{id}`
- **DELETE** `/transactions/{id}`
- **GET** `/transactions/export?start_date=&end_date=` — CSV download
- **POST** `/transactions/import?account_id=1` — multipart CSV upload; headers `date, amount, type, description`

### Budgets (`/budgets`)
- **GET** `/budgets?skip=0&limit=100`
- **GET** `/budgets/{id}` — includes spending info
- **POST** `/budgets` — body: `{ category_id, name, amount, period, start_date, end_date }`
- **PUT** `/budgets/{id}`
- **DELETE** `/budgets/{id}`

### Goals (`/goals`)
- **GET** `/goals?skip=0&limit=100`
- **GET** `/goals/{id}` — includes progress info
- **POST** `/goals` — body: `{ name, description, goal_type, target_amount, current_amount, target_date }`
- **PUT** `/goals/{id}`
- **DELETE** `/goals/{id}`

### Recurring transactions (`/recurring`)
- **GET** `/recurring?limit=50`
- **POST** `/recurring` — body: `{ account_id, category_id, amount, transaction_type, description, frequency, next_run_date }`
- **GET** `/recurring/{id}`
- **PATCH** `/recurring/{id}` — partial update
- **DELETE** `/recurring/{id}`
- **POST** `/recurring/run-now` — processes all due recurring transactions for the current user (`next_run_date <= today`), creates a transaction for each, and advances `next_run_date`. Returns `{ processed, created }`. Idempotent per run. Intended to be called from a cron job or manually.

### Checks (`/checks`)
Cheque tracking (issued and received) as a first-class entity, with Sayad tracking number support (status inquiry against the Sayad system itself is a future phase).
- **GET** `/checks?status_filter=&account_id=` — list current user's cheques, sorted by due date
- **GET** `/checks/{id}`
- **POST** `/checks` — body: `{ account_id, direction: "issued"|"received", counterparty_name, amount, bank_name?, check_number?, sayad_id?, due_date, description? }`. `404` if `account_id` doesn't belong to the current user.
- **PUT** `/checks/{id}` — partial update, incl. `status: "pending"|"cleared"|"bounced"|"voided"`
- **DELETE** `/checks/{id}` — `400` if the cheque is already `cleared`/`bounced` (void it instead, to preserve the audit trail)
- **GET** `/checks/cash-flow-forecast?days=30` — pending cheques due within the window, as known-amount cash events: `{ days, events: [{ check_id, due_date, direction, amount, counterparty_name }], total_inflow, total_outflow, net }`

### Banking messages (`/banking-messages`)
- **POST** `/banking-messages/parse` — body: `{ raw_text }`. Parses without saving; returns amount/date/description and an AI-suggested category.
- **POST** `/banking-messages/` — save + parse a message
- **GET** `/banking-messages/?limit=50`
- **GET** `/banking-messages/{id}`
- **POST** `/banking-messages/{id}/create-transaction` — body: `{ account_id, category_id }`; creates a transaction from the parsed message (category optional override)

### Payments — ZarinPal (`/payments`)
- **POST** `/payments/zarinpal/request` — body: `{ amount_rials, description, email, mobile }`; returns `{ payment_url, authority, amount_rials }`. `503` if the gateway is not configured.
- **GET** `/payments/zarinpal/callback?Authority=&Status=` — ZarinPal redirects here; backend verifies and redirects to the frontend (`FRONTEND_URL/dashboard?payment=success|failed&...`)
- **GET** `/payments?limit=50` — list current user's payments
- **GET** `/payments/{id}`
- **POST** `/payments/{id}/record-income` — body: `{ account_id }`; records a `completed` payment as an income transaction (`400` if not completed)

### Alerts (`/alerts`)
- **GET** `/alerts` — budget alerts for the current user (e.g. budgets at or over 80% spent)

### Dashboard (`/dashboard`)
- **GET** `/dashboard/summary`:
```json
{
  "total_balance": 5000.00,
  "month_income": 3000.00,
  "month_expenses": 2000.00,
  "month_net": 1000.00,
  "active_budgets": 5,
  "active_goals": 3,
  "recent_transactions": [...]
}
```
- **GET** `/dashboard/founder-overview` — KPIs, sparklines, burn-rate-style overview
- **GET** `/dashboard/cash-summary-digest?days=30` — cash in/out, net, top 3 expense categories over the last N days (used for weekly digest emails / cron)

### Reports (`/reports`)
- **GET** `/reports/expenses-by-category?start_date=&end_date=`
- **GET** `/reports/income-vs-expenses?start_date=&end_date=`
- **GET** `/reports/insights` — period-over-period spending insights (this month vs. last, category trends)

### Backup (`/backup`)
- **GET** `/backup` — export all user data (accounts, transactions, budgets, goals, recurring) as JSON
- **POST** `/backup/restore?confirm=true` — multipart JSON file upload; validates `schema_version` and `user_id` match. **Full re-import is not yet implemented** — this endpoint currently only validates the file.

## Error responses
All errors follow this format:
```json
{ "detail": "Error message" }
```

### Status codes
- `200` - Success
- `201` - Created
- `204` - No Content
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `409` - Conflict (e.g. possible duplicate transaction)
- `500` - Internal Server Error
- `503` - Service Unavailable (e.g. ZarinPal not configured)
