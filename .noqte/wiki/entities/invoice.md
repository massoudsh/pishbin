# Invoice (فاکتور)

> فاکتور صادرشده به یک مشتری — مطالبهٔ آینده (receivable)؛ همتای [[entities/check]] به‌عنوان رویداد نقدی آیندهٔ شناخته‌شده در [[concepts/forecast]]. اتصال به سامانهٔ مودیان هنوز پیاده نشده (فاز بعد).

## مسئولیت‌ها
- CRUD فاکتور: مشتری، مبلغ، تاریخ صدور، تاریخ سررسید وصول، توضیح
- چرخهٔ وضعیت: `issued → paid` یا `cancelled`؛ `issued` که `due_date` آن گذشته باشد **به‌صورت خودکار روی خواندن** (`get`/`list`) به `overdue` تبدیل و در دیتابیس commit می‌شود (`InvoiceService._sync_overdue`)
- پرداخت فقط با `POST /invoices/{id}/settle` و `{account_id, settlement_date, transaction_id?}`؛ تراکنش درآمد و موجودی و paid_date اتمیک ثبت می‌شوند، یا تراکنش موجود بدون اثر دوباره روی موجودی لینک می‌شود.
- تغذیهٔ `ForecastService.get_upcoming_invoice_events` به‌عنوان inflow آینده (فاکتورهای `issued`/`overdue` با `due_date <= today+days`)

## وابستگی‌ها
- [[entities/user]] — مالک فاکتور
- [[entities/customer]] — هر فاکتور اجباراً به یک مشتری متعلق است؛ ساخت/ویرایش فاکتور مالکیت مشتری را روی کاربر فعلی چک می‌کند (۴۰۴)
- [[concepts/forecast]] — `GET /invoices/cash-flow-forecast` و `GET /dashboard/cash-flow-forecast` روی `get_upcoming_invoice_events` سوار است

## قراردادها / Edge cases
- `InvoiceStatus` enum: `issued` | `paid` | `overdue` (derived) | `cancelled`
- `amount`: `Numeric(14,0)` — مثبت، بدون اعشار، حداکثر ۱۴ رقم؛ تسویه فعلاً تومانی و فقط با حساب فعال IRT از نوع checking/savings/other است.
- `settlement_transaction_id`: FK nullable و unique به تراکنش با `ON DELETE RESTRICT`؛ یک تراکنش نمی‌تواند هم‌زمان به فاکتور یا چک دیگر متصل شود.
- PUT با status=paid یا paid_date رد می‌شود (۴۰۹)؛ فاکتور paid/لینک‌شده قابل ویرایش نیست و حذف paid مسدود است (۴۰۰).
- تسویه فقط issued/overdue، بدون تاریخ آینده تهران یا پیش از صدور؛ تکرار همان حساب/تاریخ/تراکنش بدون ثبت دوباره است و جزئیات متناقض ۴۰۹ می‌دهد.
- تراکنش موجود باید مالک، حساب، مبلغ، جهت درآمد و روز تهران یکسان داشته باشد. ثبت جدید باید در ظرفیت Numeric(10,2) دفتر و موجودی جا شود.
- migration رکوردهای paid قدیمی را با لینک null حفظ می‌کند؛ backfill یا ثبت دوباره ندارد. پرداخت جزئی، برگشت و رفع هم‌پوشانی فاکتور/چک پیاده نشده؛ انتقال بانکی انجام نمی‌شود.
- تست SQLite/API و migration انجام شده؛ قفل ردیفی PostgreSQL در کد وجود دارد ولی تست زنده هم‌زمانی و اعمال migration تولید انجام نشده است.
- صفحه فاکتور همه صفحات حساب را با getAllAccounts می‌گیرد؛ انتخاب حساب تسویه محدود به ۱۰۰ حساب اول نیست و خطای صفحه بعد کل گزینه‌ها را پاک می‌کند (`frontend/app/invoices/page.tsx:70`).
- سامانهٔ مودیان (صورتحساب الکترونیکی مالیاتی) هنوز وصل نشده — فقط فیلدهای پایه ذخیره می‌شوند

## منابع کد
- `backend/app/models/invoice.py:32` — لینک تراکنش تسویه؛ `backend/app/schemas/invoice.py:35` — قرارداد درخواست.
- `backend/app/api/v1/invoices.py:95` — endpoint؛ `backend/app/services/settlement_service.py:24` — منطق مشترک و قفل‌ها.
- `backend/alembic/versions/20261030_add_settlement_links.py:1` — migration بدون backfill.
- `backend/tests/test_settlement_api.py:1`, `backend/tests/test_settlement_migration.py:1` — اعتبارسنجی و حفظ داده قدیمی.
- `frontend/components/forms/SettlementForm.tsx:1` — فرم مشترک با انتخاب ثبت جدید/لینک موجود.
- `pishbin/backend/app/models/invoice.py`
- `pishbin/backend/app/schemas/invoice.py`
- `pishbin/backend/app/services/invoice_service.py`
- `pishbin/backend/app/api/v1/invoices.py`
- `pishbin/backend/app/services/forecast_service.py` (`get_upcoming_invoice_events`)
- `pishbin/frontend/app/invoices/page.tsx`
- `pishbin/backend/alembic/versions/20260812_add_customers_invoices.py`
