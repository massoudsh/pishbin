# Check (چک)

> چک صادره (پرداختنی) یا دریافتی (دریافتنی)، با وضعیت وصول و شماره صیادی؛ موجودیت درجه‌یک جدید که به‌عنوان یک رویداد نقدی آینده در [[concepts/forecast]] هم استفاده می‌شود.

## مسئولیت‌ها
- ثبت چک صادره/دریافتی با طرف حساب، مبلغ، بانک، تاریخ سررسید، شماره چک، شماره صیادی
- پیگیری چرخه وضعیت: `pending → cleared` یا `bounced` یا `voided`
- تغذیهٔ `ForecastService.get_upcoming_check_events` برای نمایش چک‌های در جریان به‌عنوان جریان نقدی شناخته‌شدهٔ آینده (بدون نیاز به تخمین، بر خلاف پیش‌بینی میانگین هزینه)

## وابستگی‌ها
- [[entities/user]] — مالک چک
- [[entities/account]] — هر چک به یک حساب متعلق است؛ ساخت چک مالکیت account را روی کاربر فعلی چک می‌کند (۴۰۴ در نفوذ)
- [[entities/customer]] — لینک اختیاری (`customer_id` nullable)؛ چک‌های `direction=received` لینک‌شده در امتیاز رفتار پرداخت مشتری (نرخ برگشتی) استفاده می‌شوند
- [[concepts/forecast]] — `GET /checks/cash-flow-forecast` روی `ForecastService.get_upcoming_check_events` سوار است

## قراردادها / Edge cases
- `CheckDirection` enum: `issued` (صادره، outflow) | `received` (دریافتی، inflow)
- `CheckStatus` enum: `pending` | `cleared` | `bounced` | `voided`
- `amount`: `Numeric(14,0)` — مثبت، بدون اعشار، حداکثر ۱۴ رقم؛ تسویه فقط تومانی روی حساب فعال IRT نقدی.
- `sayad_id`: رشتهٔ اختیاری ۱۶ رقمی (شماره صیادی)؛ **استعلام واقعی از سامانهٔ صیاد هنوز پیاده نشده — فاز بعد** (فقط فیلد ذخیره می‌شود)
- حذف چک cleared/bounced مسدود است (۴۰۰)؛ cleared/لینک‌شده قابل ویرایش یا ابطال نیست. تغییر status به cleared فقط از endpoint تسویه مجاز است (PUT: ۴۰۹).
- `POST /checks/{id}/settle` با `{settlement_date, transaction_id?}` برای pending/bounced؛ حساب ثابت چک است. دریافتی income و صادره expense با اصلاح اتمیک موجودی، یا لینک تراکنش موجود بدون اثر دوباره.
- `settlement_transaction_id` nullable و unique با FK محدودکننده حذف است؛ کنترل مالکیت/روز تهران/تکرار و محدودیت‌ها همان [[entities/invoice]] هستند. cleared قدیمی بدون لینک خودکار ثبت نمی‌شود؛ voided تسویه نمی‌شود.
- فرم واقعی جایگزین تغییر وضعیت ساده شده؛ خطای دریافت با داده نمونه پنهان نمی‌شود و لینک تراکنش/هشدار رکورد قدیمی نمایش داده می‌شود.
- صفحه چک همه صفحات حساب را با getAllAccounts می‌گیرد (`frontend/app/checks/page.tsx:73`)؛ خطای صفحه بعد فهرست جزئی را نمایش نمی‌دهد.
- در [[concepts/decision-center]] چک صادره bounced تا تسویه همچنان تعهد است و یک‌بار روز اول رزرو می‌شود؛ bounced دریافتی فرض وصول ندارد.

## منابع کد
- `backend/app/models/check.py:41` — FK تسویه؛ `backend/app/schemas/check.py:44` — درخواست.
- `backend/app/api/v1/checks.py:96` — endpoint؛ `backend/app/services/settlement_service.py:24` — جریان مشترک.
- `frontend/components/forms/SettlementForm.tsx:1`, `backend/tests/test_settlement_api.py:1` — فرم و تست‌ها.
- `pishbin/backend/app/models/check.py`
- `pishbin/backend/app/schemas/check.py`
- `pishbin/backend/app/services/check_service.py`
- `pishbin/backend/app/api/v1/checks.py`
- `pishbin/backend/app/services/forecast_service.py` (`get_upcoming_check_events`)
- `pishbin/frontend/app/checks/page.tsx`
- `pishbin/backend/alembic/versions/20260809_add_checks.py`
