# Transaction

> رکورد مالی اصلی (درآمد/هزینه/انتقال) که پایه گزارش‌گیری، بودجه و پیش‌بینی نقدینگی است.

## مسئولیت‌ها
- ثبت مبلغ، نوع (`income`/`expense`/`transfer`)، تاریخ (index شده برای کوئری‌های بازه‌ای)، دسته‌بندی اختیاری
- ورودی اصلی برای [[concepts/forecast]] (میانگین ۶ ماه اخیر هزینه‌ها)

## وابستگی‌ها
- [[entities/user]], [[entities/account]] — مالکیت
- `Category` (`backend/app/models/category.py`) — دسته‌بندی اختیاری، رنگ/آیکون برای UI
- [[entities/banking-message]] — می‌تواند از پارس پیامک بانکی تولید شود (`transaction_id` روی BankingMessage ست می‌شود)
- [[entities/recurring-transaction]] — قالب مولد تراکنش‌های دوره‌ای

## قراردادها / Edge cases
- `amount` همیشه مثبت است؛ علامت با `transaction_type` تعیین می‌شود (نه با خود amount)
- `date` نال‌پذیر نیست و index دارد

## منابع کد
- `backend/app/models/transaction.py`
- `backend/app/services/transactions_service.py`, `reports_service.py`, `forecast_service.py`
- `backend/app/api/v1/transactions.py`, `reports.py`
