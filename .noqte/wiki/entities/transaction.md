# Transaction

> رکورد مالی اصلی (درآمد/هزینه/انتقال) که پایه گزارش‌گیری، بودجه و پیش‌بینی نقدینگی است.

## مسئولیت‌ها
- ثبت مبلغ، نوع (`income`/`expense`/`transfer`)، تاریخ (index شده برای کوئری‌های بازه‌ای)، دسته‌بندی اختیاری
- ورودی اصلی برای [[concepts/forecast]] (میانگین ۶ ماه اخیر هزینه‌ها)

## وابستگی‌ها
- [[entities/user]], [[entities/account]] — مالکیت
- `Category` (`pishbin/backend/app/models/category.py`) — دسته‌بندی اختیاری، رنگ/آیکون برای UI
- [[entities/banking-message]] — می‌تواند از پارس پیامک بانکی تولید شود (`transaction_id` روی BankingMessage ست می‌شود)
- [[entities/recurring-transaction]] — قالب مولد تراکنش‌های دوره‌ای

## قراردادها / Edge cases
- amount در ورودی create/update باید مثبت، حداکثر ۱۰ رقم و ۲ اعشار باشد؛ صفر/منفی ۴۲۲ و بدون اثر روی مانده است. علامت با transaction_type تعیین می‌شود. schema خواندن تاریخی تغییر نکرده است.
- update برای account_id/amount/transaction_type/date مقدار صریح null نمی‌پذیرد (۴۲۲)، ولی حذف کلید یعنی عدم تغییر؛ category/description/notes همچنان nullable هستند.
- `date` نال‌پذیر نیست و index دارد
- تراکنش تسویه [[entities/invoice]]/[[entities/check]] از PUT/DELETE قابل تغییر یا حذف نیست (۴۰۹)؛ یک تراکنش فقط یک سند را تسویه می‌کند.
- ثبت جدید تسویه با تغییر اتمیک موجودی انجام می‌شود؛ لینک تراکنش موجود نیازمند تطابق مالک، حساب، مبلغ، جهت و روز تهران است و دوباره موجودی را تغییر نمی‌دهد.
- create/update/delete حساب‌ها را با قفل و reload می‌خوانند تا موجودی stale استفاده نشود؛ تست هم‌زمانی زنده PostgreSQL انجام نشده است.

## منابع کد
- `backend/app/schemas/transaction.py:11` — PositiveMoney؛ `:40` — validator نال؛ `backend/tests/test_api.py:29` — رد ورودی و ثابت‌ماندن موجودی.
- `backend/app/services/transactions_service.py:125` — محافظ تسویه؛ `backend/app/services/settlement_service.py:24` — ثبت/لینک.
- `backend/tests/test_settlement_api.py:1` — منع تغییر و ثبت تکراری.
- `pishbin/backend/app/models/transaction.py`
- `pishbin/backend/app/services/transactions_service.py`, `reports_service.py`, `forecast_service.py`
- `pishbin/backend/app/api/v1/transactions.py`, `reports.py`
