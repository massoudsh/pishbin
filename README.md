# پیش‌بین (Pishbin)

**کوپایلوت هوشمند تصمیم‌سازی مالی برای کسب‌وکارهای کوچک و متوسط ایرانی**

پیش‌بین داده‌های مالی پراکنده — فاکتور، چک، رفتار پرداخت مشتری — را در یک‌جا کنار هم می‌گذارد و نشان می‌دهد تصمیم امروز چه تأثیری روی ۳۰ روز آینده جریان نقدی می‌گذارد؛ تا صاحب یک کسب‌وکار کوچک ایرانی مجبور نباشد خودش تنها CFO خودش باشد. بک‌اند با FastAPI و فرانت‌اند با Next.js ساخته شده است.

## امکانات

- احراز هویت با JWT + **تأیید دومرحله‌ای (2FA)** با اپ Authenticator
- **API Key** برای دسترسی برنامه‌نویسی/یکپارچه‌سازی
- مدیریت حساب‌ها (جاری، پس‌انداز، کارت اعتباری و ...)
- ثبت و دسته‌بندی تراکنش‌ها
- بودجه‌بندی با پیگیری هزینه نسبت به بودجه
- اهداف مالی و پیگیری پیشرفت
- **پیام بانکی** — استخراج خودکار تراکنش از پیامک‌های بانکی
- **تراکنش‌های تکرارشونده (Recurring)**
- **پرداخت آنلاین با زرین‌پال**
- هشدارها (Alerts) و پشتیبان‌گیری (Backup)
- داشبورد با خلاصه وضعیت مالی، گزارش‌ها و تحلیل‌ها
- پیش‌بینی هزینه‌ها

## پشته فناوری

### بک‌اند
- FastAPI — فریم‌ورک وب پایتون
- SQLAlchemy — ORM برای عملیات دیتابیس
- PostgreSQL — دیتابیس
- JWT + TOTP (2FA) — احراز هویت
- Pydantic — اعتبارسنجی داده

### فرانت‌اند
- Next.js 15+ — فریم‌ورک React
- TypeScript — type safety
- Tailwind CSS — استایل‌دهی
- Zod — اعتبارسنجی schema
- Recharts — نمایش داده

## شروع کار

### پیش‌نیازها

- Python 3.11+
- Node.js 18+
- PostgreSQL 15+ (یا از Docker استفاده کنید)
- Docker و Docker Compose (اختیاری)

### راه‌اندازی بک‌اند

۱. ورود به پوشه backend:
```bash
cd backend
```

۲. ساخت محیط مجازی:
```bash
python -m venv venv
source venv/bin/activate  # در ویندوز: venv\Scripts\activate
```

۳. نصب وابستگی‌ها:
```bash
pip install -r requirements.txt
```

۴. ساخت فایل `.env` در پوشه backend (نمونه: `backend/.env.example`). **PostgreSQL الزامی است.**
```env
# فقط برای dev محلی — این مقادیر default هرگز نباید در production استفاده شوند
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/personalfinance
AUTO_CREATE_DB=true
SECRET_KEY=your-secret-key-change-in-production
DEBUG=true
```
مطمئن شوید PostgreSQL در حال اجراست و دیتابیس ساخته شده (مثلاً `createdb personalfinance`).

> **Production:** `DEBUG=false`, `SECRET_KEY` و `DATABASE_URL` واقعی الزامی است — اگر این مقادیر default باقی بمانند، اپلیکیشن در startup fail می‌کند (`app/core/config.py`).

۵. راه‌اندازی دیتابیس (یکی را انتخاب کنید):
   - **شروع سریع (فقط ساخت جدول‌ها):** `python -m app.db.init_db`
   - **حالت Production (مایگریشن با Alembic):**
     `alembic upgrade head`
     برای ساخت مایگریشن جدید بعد از تغییر مدل‌ها: `alembic revision --autogenerate -m "description"`

۶. اجرای سرور توسعه:
```bash
uvicorn app.main:app --reload
```

API روی `http://localhost:8000` در دسترس است.
مستندات API: `http://localhost:8000/docs`

### راه‌اندازی فرانت‌اند

۱. ورود به پوشه frontend:
```bash
cd frontend
```

۲. نصب وابستگی‌ها:
```bash
npm install
```

۳. ساخت فایل `.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
```

۴. اجرای سرور توسعه:
```bash
npm run dev
```

فرانت‌اند روی `http://localhost:3000` در دسترس است.

### راه‌اندازی با Docker

۱. اجرای همه سرویس‌ها:
```bash
docker compose up -d --build
```

۲. دسترسی به برنامه:
   - Backend API: `http://localhost:8000`
   - Frontend: `http://localhost:3000` (جداگانه با `cd frontend && npm run dev` اجرا می‌شود؛ Docker Compose فقط backend و Postgres را اجرا می‌کند)

برای **استقرار در محیط production** (متغیرهای محیطی، CORS، مایگریشن، health check، override پروداکشن Docker) به **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)** مراجعه کنید.

## ساختار پروژه

```
pishbin/
├── backend/
│   ├── app/
│   │   ├── api/v1/        # endpoint های API
│   │   ├── core/          # پیکربندی هسته
│   │   ├── db/            # راه‌اندازی دیتابیس
│   │   ├── models/        # مدل‌های SQLAlchemy
│   │   ├── schemas/       # اسکیمای Pydantic
│   │   └── services/      # منطق کسب‌وکار
│   ├── requirements.txt
│   └── Dockerfile
├── frontend/
│   ├── app/               # پوشه app در Next.js
│   ├── components/        # کامپوننت‌های React
│   └── lib/               # ابزارهای کمکی
├── docs/                  # مستندات
└── docker-compose.yml
```

## Endpoint های API

فهرست کامل تمام endpoint ها (احراز هویت، 2FA، API Key، حساب‌ها، تراکنش‌ها، بودجه، اهداف، تراکنش تکرارشونده، پیام بانکی، پرداخت زرین‌پال، هشدار، داشبورد، گزارش، بک‌آپ) در **[docs/API_SPEC.md](docs/API_SPEC.md)** آمده است.

نمونه‌ای از مسیرهای اصلی:

- `POST /api/v1/auth/register` — ثبت‌نام کاربر جدید
- `POST /api/v1/auth/login` — ورود و دریافت توکن
- `GET /api/v1/auth/me` — اطلاعات کاربر فعلی
- `GET/POST /api/v1/businesses` — لیست/ساخت کسب‌وکار (چند شعبه/کسب‌وکار)، `POST /api/v1/businesses/{id}/set-default` برای سوییچ
- `GET/POST /api/v1/accounts` — لیست/ساخت حساب (هر حساب متعلق به یک کسب‌وکار است)
- `GET/POST /api/v1/transactions` — لیست/ساخت تراکنش
- `GET/POST /api/v1/budgets` — لیست/ساخت بودجه
- `GET/POST /api/v1/goals` — لیست/ساخت هدف مالی
- `GET/POST /api/v1/recurring` — تراکنش تکرارشونده
- `POST /api/v1/banking-messages` — استخراج تراکنش از پیامک بانکی
- `POST /api/v1/payments/*` — پرداخت زرین‌پال
- `GET /api/v1/dashboard/summary` — خلاصه داشبورد
- `GET /api/v1/reports/*` — گزارش‌ها

## توسعه

نقشه‌راه توسعه فازبندی‌شده در [docs/PHASES.md](docs/PHASES.md) و از طریق [GitHub issues](https://github.com/massoudsh/pishbin/issues) پیگیری می‌شود. مسیرهای کاربری (flow های تراکنش، حساب، بودجه، هدف، احراز هویت) در [docs/USER_FLOWS.md](docs/USER_FLOWS.md) آمده است.

### اجرای تست‌ها
```bash
# تست‌های بک‌اند
cd backend
pytest

# تست‌های فرانت‌اند
cd frontend
npm test
```

### فرمت‌دهی کد
```bash
# بک‌اند
black app/
isort app/

# فرانت‌اند
npm run lint
npm run format
```

## مجوز

MIT
