# Recurring Transaction

> قالب تراکنش دوره‌ای (مثل حقوق ماهانه یا اجاره) که در `next_run_date` باعث ساخته‌شدن یک [[entities/transaction]] واقعی می‌شود.

## وابستگی‌ها
- [[entities/user]], [[entities/account]] — مالکیت
- `Category` — دسته اختیاری

## قراردادها / Edge cases
- `RecurrenceFrequency` enum: weekly, monthly, yearly
- `is_active` در این مدل `Integer` است (۱=فعال، ۰=متوقف) نه Boolean — ناهماهنگ با بقیه مدل‌ها که `Boolean` استفاده می‌کنند
- `next_run_date` index دارد (برای کوئری سریع cronهای اجراکننده)

## منابع کد
- `backend/app/models/recurring.py`
- `backend/app/api/v1/recurring.py`
- `frontend/app/recurring/page.tsx`
