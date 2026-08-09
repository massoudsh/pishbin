# Prisma + PostgreSQL (Pishbin Frontend)

Prisma is integrated in the **frontend** (Next.js) for server-side access to a PostgreSQL database with **mock/seed data** and reusable logic. Use a **separate database** (e.g. `pishbin_prisma`) so it does not conflict with the FastAPI + SQLAlchemy backend.

## Setup

1. **Create a PostgreSQL database** for Prisma (e.g. same server, different DB name):
   ```bash
   createdb pishbin_prisma
   ```

2. **Environment**  
   In `frontend/.env.local` (or `.env`), set:
   ```env
   PRISMA_DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/pishbin_prisma?schema=public"
   ```
   Copy from `frontend/.env.example` if needed.

3. **Install and generate**
   ```bash
   cd frontend
   npm install
   npx prisma generate
   ```

4. **Push schema and seed**
   ```bash
   npx prisma db push
   npx prisma db seed
   ```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run prisma:generate` | Generate Prisma Client |
| `npm run prisma:push` | Push schema to DB (no migrations) |
| `npm run prisma:seed` | Run seed (mock data for all models) |
| `npm run prisma:studio` | Open Prisma Studio |

## Schema and mock data

- **Schema:** `frontend/prisma/schema.prisma` — all entities (User, Account, Category, Transaction, Budget, Goal, BankingMessage, Payment, RecurringTransaction) and relations; no duplicate field names.
- **Seed:** `frontend/prisma/seed.ts` — one-off mock data for every model and relations (unique emails/usernames, no duplicate rows).
- **Client:** `frontend/lib/prisma.ts` — singleton Prisma client for server-side use.

## Example usage

- **API route:** `GET /api/prisma-mock` uses Prisma to return counts and a sample user with accounts (verifies connection and relations).
- **Server components or API routes:** import `prisma` from `@/lib/prisma` and run queries.

## Notes

- The main app API remains the **FastAPI** backend; Prisma is for optional server-side logic or a future Node API using the same schema.
- Tables are mapped with `@@map` to names compatible with the backend (e.g. `users`, `accounts`).
