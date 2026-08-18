# Invoice (فاکتور)

> فاکتور صادرشده به یک مشتری — مطالبهٔ آینده (receivable)؛ همتای [[entities/check]] به‌عنوان رویداد نقدی آیندهٔ شناخته‌شده در [[concepts/forecast]]. اتصال به سامانهٔ مودیان هنوز پیاده نشده (فاز بعد).

## مسئولیت‌ها
- CRUD فاکتور: مشتری، مبلغ، تاریخ صدور، تاریخ سررسید وصول، توضیح
- چرخهٔ وضعیت: `issued → paid` یا `cancelled`؛ `issued` که `due_date` آن گذشته باشد **به‌صورت خودکار روی خواندن** (`get`/`list`) به `overdue` تبدیل و در دیتابیس commit می‌شود (`InvoiceService._sync_overdue`)
- علامت‌گذاری `paid` اگر `paid_date` داده نشود، خودکار امروز را ثبت می‌کند
- تغذیهٔ `ForecastService.get_upcoming_invoice_events` به‌عنوان inflow آینده (فاکتورهای `issued`/`overdue` با `due_date <= today+days`)

## وابستگی‌ها
- [[entities/user]] — مالک فاکتور
- [[entities/customer]] — هر فاکتور اجباراً به یک مشتری متعلق است؛ ساخت/ویرایش فاکتور مالکیت مشتری را روی کاربر فعلی چک می‌کند (۴۰۴)
- [[concepts/forecast]] — `GET /invoices/cash-flow-forecast` و `GET /dashboard/cash-flow-forecast` روی `get_upcoming_invoice_events` سوار است

## قراردادها / Edge cases
- `InvoiceStatus` enum: `issued` | `paid` | `overdue` (derived) | `cancelled`
- `amount`: `Numeric(14,0)` — ریال، بدون اعشار (هم‌الگو با [[entities/check]])
- حذف فاکتور بعد از `paid` مسدود است (۴۰۰)
- سامانهٔ مودیان (صورتحساب الکترونیکی مالیاتی) هنوز وصل نشده — فقط فیلدهای پایه ذخیره می‌شوند

## منابع کد
- `backend/app/models/invoice.py`
- `backend/app/schemas/invoice.py`
- `backend/app/services/invoice_service.py`
- `backend/app/api/v1/invoices.py`
- `backend/app/services/forecast_service.py` (`get_upcoming_invoice_events`)
- `frontend/app/invoices/page.tsx`
- `backend/alembic/versions/20260812_add_customers_invoices.py`
