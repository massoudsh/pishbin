# Pishbin — Production Deployment

This document covers production deployment: environment variables, Docker, database migrations, CORS, health checks, and optional monitoring.

## Environment variables

### Backend (API)

| Variable | Description | Production |
|----------|-------------|------------|
| `DATABASE_URL` | PostgreSQL connection string | Use managed Postgres (e.g. Supabase, Railway, Neon). |
| `SECRET_KEY` | JWT signing key | Generate a long random string; never use the default. |
| `DEBUG` | Enable debug mode | Set to `false`. |
| `AUTO_CREATE_DB` | Create tables on startup | Set to `false`; use migrations instead. |
| `CORS_ORIGINS` | Allowed frontend origins | Comma-separated, e.g. `https://yourapp.vercel.app,https://www.yourapp.com`. |

Copy `backend/.env.example` to `backend/.env` and set values. In production, use your platform’s secret management (e.g. Vercel env, Railway variables).

### Frontend

| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | Backend API base URL, e.g. `https://api.yourapp.com/api/v1`. |

## Database migrations

Do **not** rely on `AUTO_CREATE_DB` in production. Use Alembic:

```bash
cd backend
# Set DATABASE_URL to production DB
alembic upgrade head
```

To create a new migration after model changes:

```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
```

## Docker

The stack is `postgres` + `backend` (FastAPI) + `frontend` (Next.js standalone), with nginx added in production.

- **Development:** `docker compose up -d --build`
  `docker-compose.override.yml` is loaded automatically and adds host ports (`5433`, `8000`, `3000`), the `./backend:/app` source mount, and `--reload`.
- **Production:** explicit `-f` files disable the dev override:

  ```bash
  cp .env.example .env   # fill in SECRET_KEY, POSTGRES_PASSWORD, CORS_ORIGINS, NEXT_PUBLIC_API_URL
  docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
  ```

  This publishes only nginx on port 80, runs the backend with 2 workers, and applies migrations automatically.

### Build-time frontend variables

`NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_APP_ENV` are inlined into the browser bundle by Next.js. They are passed as Docker **build args**, not runtime environment variables — rebuild the frontend image after changing them:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build frontend
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

### Migrations in containers

The backend entrypoint runs `alembic upgrade head` when `RUN_MIGRATIONS=true` (set in the production override) and then starts uvicorn. Development uses `AUTO_CREATE_DB=true` instead. To run migrations manually:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm backend alembic upgrade head
```

### Optional Prisma demo database

The frontend contains a demo route (`/api/prisma-mock`) backed by Prisma. Postgres creates a separate `pishbin_prisma` database on first initialization so its tables never collide with the FastAPI schema. Create the demo tables once with:

```bash
docker compose --profile prisma run --rm prisma-setup
```

The main application does not depend on this database.

### Health checks

- `postgres`: `pg_isready`
- `backend`: `GET /health`
- `frontend`: HTTP request to `/` from inside the container

nginx starts only after the backend and frontend report healthy.

### Image hygiene

`backend/.dockerignore` and `frontend/.dockerignore` keep virtualenvs, `node_modules`, `.next`, tests, and local env files out of the build context. Both images run as non-root users.


## Health check

The API exposes a health endpoint for load balancers and monitoring:

- **GET** `/health` → `200` with `{"status":"healthy"}`.

Use this in Docker `healthcheck`, Kubernetes liveness/readiness, or your hosting provider’s health URL.

## CORS

Set `CORS_ORIGINS` to the exact origin(s) of your frontend (e.g. Vercel deployment URL). Multiple origins: comma-separated, no spaces, or as a JSON array depending on your env parsing.

## Frontend deployment (e.g. Vercel)

1. Connect the repo to Vercel.
2. Set **Root Directory** to `frontend`.
3. Set `NEXT_PUBLIC_API_URL` to your backend API base (e.g. `https://your-api.railway.app/api/v1`).
4. Deploy.

## Backend deployment (e.g. Railway, Render, Fly.io)

1. Set root to `backend` or point build to `backend/Dockerfile`.
2. Add a PostgreSQL service and set `DATABASE_URL`.
3. Set `SECRET_KEY` and `CORS_ORIGINS`.
4. Set start command to `uvicorn app.main:app --host 0.0.0.0 --port $PORT` (use `$PORT` if the platform provides it).
5. Run migrations in a release step or manually once.

## Logging and monitoring

- The backend uses Python `logging`; level is driven by `DEBUG`.
- For production, consider shipping logs to a provider (e.g. Datadog, Logtail, or your platform’s logging).
- Optional: add Prometheus metrics and a `/metrics` endpoint; then use Grafana or your provider’s dashboard.

## Checklist

- [ ] Strong `SECRET_KEY` set; `DEBUG=false`.
- [ ] Production `DATABASE_URL`; migrations run (`alembic upgrade head`, automatic via `RUN_MIGRATIONS=true`).
- [ ] `CORS_ORIGINS` set to frontend origin(s).
- [ ] Health check configured (`/health`).
- [ ] Frontend `NEXT_PUBLIC_API_URL` points to backend API and the image was rebuilt after changing it.
- [ ] `.env` is not committed; only `.env.example` is tracked.
