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
- `amount`: `Numeric(14,0)` — ریال، بدون اعشار
- `sayad_id`: رشتهٔ اختیاری ۱۶ رقمی (شماره صیادی)؛ **استعلام واقعی از سامانهٔ صیاد هنوز پیاده نشده — فاز بعد** (فقط فیلد ذخیره می‌شود)
- حذف چک بعد از `cleared`/`bounced` مسدود است (۴۰۰) — برای حفظ audit trail باید وضعیت را `voided` کرد

## منابع کد
- `backend/app/models/check.py`
- `backend/app/schemas/check.py`
- `backend/app/services/check_service.py`
- `backend/app/api/v1/checks.py`
- `backend/app/services/forecast_service.py` (`get_upcoming_check_events`)
- `frontend/app/checks/page.tsx`
- `backend/alembic/versions/20260809_add_checks.py`
