# Deployment

> توپولوژی اجرا: postgres + backend (FastAPI/uvicorn) + frontend (Next.js)، هرکدام container جدا.

## Dev (`docker-compose.yml`)
- `postgres:15` روی پورت میزبان `5433` (کانتینر ۵۴۳۲)، دیتابیس `personalfinance`
- `backend` روی `8000`، `--reload` فعال، `AUTO_CREATE_DB=true`، volume mount زنده از `./backend`
- `frontend` روی `3000`، `NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1`

## Production
جزئیات کامل (env vars, CORS, migrations, health check, override) در `docs/DEPLOYMENT.md` — از `docker-compose.prod.yml` + `nginx/` استفاده می‌شود.

## متغیرهای محیطی کلیدی (`backend/app/core/config.py`)
- `DATABASE_URL`, `SECRET_KEY` (باید در prod عوض شود وگرنه raise می‌کند — بنگر [[concepts/auth]])
- `CORS_ORIGINS` (comma-separated در prod)
- `ZARINPAL_MERCHANT_ID`, `ZARINPAL_SANDBOX`, `ZARINPAL_CALLBACK_BASE_URL`, `FRONTEND_URL` — برای [[entities/payment]]
- `SMTP_*`, `EMAIL_ENABLED` — برای ایمیل بازیابی پسورد

## منابع کد
- `docker-compose.yml`, `docker-compose.prod.yml`
- `nginx/`
- `docs/DEPLOYMENT.md`, `docs/PHASES.md`, `docs/USER_FLOWS.md`
