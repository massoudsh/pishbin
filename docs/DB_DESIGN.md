# Database Design

## Overview
PostgreSQL database with SQLAlchemy ORM. Most tables include `created_at` and `updated_at` timestamps. Source of truth: `backend/app/models/`.

## Tables

### users
- `id` (PK, Integer)
- `email` (String, Unique, Indexed)
- `username` (String, Unique, Indexed)
- `hashed_password` (String)
- `full_name` (String, Nullable)
- `is_active` (Boolean, Default: True)
- `is_superuser` (Boolean, Default: False)
- `totp_secret` (String(32), Nullable) — set when 2FA is enabled
- `dashboard_preferences` (Text, Nullable) — JSON: widget IDs and order
- `created_at` / `updated_at`

### accounts
- `id` (PK, Integer)
- `user_id` (FK -> users.id)
- `name` (String)
- `account_type` (Enum: checking, savings, credit_card, investment, loan, other)
- `balance` (Numeric(10,2), Default: 0.00)
- `currency` (String, Default: "USD")
- `description` (String, Nullable)
- `is_active` (Boolean, Default: True)
- `created_at` / `updated_at`

### categories
- `id` (PK, Integer)
- `name` (String, Indexed, Unique in practice — enforced at API level)
- `description` (String, Nullable)
- `color` (String, Nullable) — hex color for UI
- `icon` (String, Nullable) — icon name for UI
- `created_at`

### transactions
- `id` (PK, Integer)
- `user_id` (FK -> users.id)
- `account_id` (FK -> accounts.id)
- `category_id` (FK -> categories.id, Nullable)
- `amount` (Numeric(10,2))
- `transaction_type` (Enum: income, expense, transfer)
- `description` (Text, Nullable)
- `date` (DateTime, Indexed)
- `notes` (Text, Nullable)
- `created_at` / `updated_at`

### budgets
- `id` (PK, Integer)
- `user_id` (FK -> users.id)
- `category_id` (FK -> categories.id, Nullable)
- `name` (String)
- `amount` (Numeric(10,2))
- `period` (Enum: weekly, monthly, yearly, Default: monthly)
- `start_date` (Date)
- `end_date` (Date, Nullable)
- `is_active` (Boolean, Default: True)
- `created_at` / `updated_at`

### goals
- `id` (PK, Integer)
- `user_id` (FK -> users.id)
- `name` (String)
- `description` (String, Nullable)
- `goal_type` (Enum: savings, debt_payoff, purchase, emergency_fund, other)
- `target_amount` (Numeric(10,2))
- `current_amount` (Numeric(10,2), Default: 0.00)
- `target_date` (Date, Nullable)
- `status` (Enum: active, completed, paused, cancelled, Default: active)
- `created_at` / `updated_at`

### banking_messages
Raw bank SMS/push text and its parsed result.
- `id` (PK, Integer)
- `user_id` (FK -> users.id)
- `raw_text` (Text)
- `source` (String(50), Nullable) — e.g. "sms", "push", "email"
- `parsed_amount` (Numeric(10,2), Nullable)
- `parsed_date` (DateTime, Nullable)
- `parsed_description` (String(500), Nullable)
- `parsed_type` (String(20), Nullable) — "income" or "expense"
- `suggested_category_id` (FK -> categories.id, Nullable)
- `transaction_id` (FK -> transactions.id, Nullable) — set once converted
- `created_at`

### payments
ZarinPal (or other) gateway transaction record.
- `id` (PK, Integer)
- `user_id` (FK -> users.id)
- `amount_rials` (Numeric(14,0)) — ZarinPal uses Rials
- `description` (Text, Nullable)
- `authority` (String(64), Nullable, Indexed) — from gateway request
- `status` (String(20), Default: "pending") — pending | completed | failed | cancelled
- `ref_id` (String(64), Nullable) — from gateway verify (success)
- `gateway` (String(32), Default: "zarinpal")
- `extra_data` (Text, Nullable) — optional JSON (email, mobile)
- `created_at` / `updated_at`

### recurring_transactions
Template for scheduled income/expense transactions.
- `id` (PK, Integer)
- `user_id` (FK -> users.id)
- `account_id` (FK -> accounts.id)
- `category_id` (FK -> categories.id, Nullable)
- `amount` (Numeric(10,2))
- `transaction_type` (String(20)) — income | expense
- `description` (Text, Nullable)
- `frequency` (Enum: weekly, monthly, yearly)
- `next_run_date` (Date, Indexed)
- `is_active` (Integer, Default: 1) — 1 = active, 0 = paused
- `created_at` / `updated_at`

### api_keys
Programmatic access credentials.
- `id` (PK, Integer)
- `user_id` (FK -> users.id, `ondelete="CASCADE"`, Indexed)
- `name` (String(100)) — user-facing label
- `key_hash` (String(64), Unique) — SHA-256 of the plaintext key (`pishbin_...`); plaintext is shown only once, at creation
- `last_used_at` (DateTime, Nullable)
- `created_at`

## Relationships
- User → Accounts, Transactions, Budgets, Goals, BankingMessages, Payments, RecurringTransactions, ApiKeys (all One-to-Many, cascade delete)
- Account → Transactions, RecurringTransactions (One-to-Many)
- Category → Transactions, Budgets, RecurringTransactions, BankingMessages (One-to-Many)
- Transaction ← BankingMessage (nullable back-reference once a message is converted)

## Indexes
- `users.email`, `users.username` — unique indexes
- `transactions.date` — index for date filtering
- `categories.name` — index for category lookup
- `payments.authority` — index for gateway callback lookup
- `recurring_transactions.next_run_date` — index for due-item scans
- `api_keys.user_id` — index for per-user key listing

## Constraints
- Account balance cannot be negative (enforced at application level)
- Transaction amount, budget amount, and goal target_amount must be positive (enforced at application level)
- `api_keys.key_hash` is unique (SHA-256 of the plaintext key)
- Backup restore validates `schema_version` and `user_id` match before proceeding (no destructive restore is implemented yet)
