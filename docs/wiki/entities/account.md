# Account

> حساب مالی کاربر (چک‌جاری، پس‌انداز، کارت اعتباری، سرمایه‌گذاری، وام، سایر)؛ ظرف نگهدارنده موجودی و تراکنش‌ها.

## مسئولیت‌ها
- نگهداری `balance` (Numeric 10,2) و `currency` (پیش‌فرض USD — با توجه به پوزیشنینگ ایرانی احتمالاً باید Toman/Rial شود، بررسی لازم)
- منبع تراکنش‌های عادی و تراکنش‌های تکرارشونده

## وابستگی‌ها
- [[entities/user]] — مالک حساب
- [[entities/business]] — هر Account اجباراً به یک Business تعلق دارد (`business_id`, nullable=False)؛ ساخت Account مالکیت business را روی کاربر فعلی چک می‌کند
- [[entities/transaction]] — `cascade="all, delete-orphan"` روی حذف حساب
- [[entities/recurring-transaction]] — قالب‌های دوره‌ای متصل به حساب
- [[entities/check]] — چک‌های صادره/دریافتی متصل به حساب

## قراردادها / Edge cases
- `AccountType` enum: checking, savings, credit_card, investment, loan, other
- حذف Account → حذف کاسکیدی تراکنش‌های آن
- `GET /accounts` قابل فیلتر با `?business_id=` است

## منابع کد
- `backend/app/models/account.py`
- `backend/app/services/accounts_service.py`
- `backend/app/api/v1/accounts.py`
