# Customer (مشتری)

> موجودیت مشتری (طرف حساب فروش)؛ لینک بین [[entities/invoice]] و [[entities/check]] (چک دریافتی) که یک امتیاز ساده رفتار پرداخت از آن استخراج می‌شود.

## مسئولیت‌ها
- ثبت مشتری: نام، تلفن/ایمیل (اختیاری)، کد ملی/اقتصادی (اختیاری)، یادداشت
- `GET /customers/{id}/score` → `CustomerService.get_customer_score`: میانگین روز تأخیر وصول فاکتور (`paid_date - due_date`، فقط فاکتورهای پرداخت‌شده) + نرخ چک برگشتی (از چک‌های `direction=received` لینک‌شده به این مشتری)

## وابستگی‌ها
- [[entities/user]] — مالک مشتری
- [[entities/invoice]] — هر فاکتور اجباراً به یک مشتری متعلق است (`customer_id` non-null)؛ حذف مشتری فاکتورهایش را هم حذف می‌کند (cascade)
- [[entities/check]] — لینک اختیاری (`customer_id` nullable) برای محاسبهٔ نرخ چک برگشتی
- [[concepts/forecast]] — امتیاز مشتری هنوز مستقیماً به forecast متصل نشده (فاز بعد طبق ایشو #50)

## قراردادها / Edge cases
- `avg_days_late` فقط روی فاکتورهای `status=paid` با `paid_date` ثبت‌شده حساب می‌شود؛ تأخیر منفی (پرداخت زودتر) صفر در نظر گرفته می‌شود (`max(0, ...)`)
- `bounced_check_rate` اگر مشتری هیچ چکی نداشته باشد صفر است (تقسیم بر صفر گارد شده)

## منابع کد
- `backend/app/models/customer.py`
- `backend/app/schemas/customer.py`
- `backend/app/services/customer_service.py`
- `backend/app/api/v1/customers.py`
- `frontend/app/customers/page.tsx`
- `backend/alembic/versions/20260812_add_customers_invoices.py`
