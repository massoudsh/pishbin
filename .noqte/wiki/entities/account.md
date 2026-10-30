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
- حذف Account → حذف کاسکیدی تراکنش‌ها، مگر حساب دارای سابقه تسویه فاکتور/چک که حذفش ۴۰۹ می‌دهد.
- حساب دارای تسویه اجازه overwrite موجودی، ارز یا نوع را ندارد (۴۰۹)؛ سایر اطلاعات قابل تغییر است و تراکنش عادی همچنان موجودی را به‌روزرسانی می‌کند.
- تسویه فقط حساب فعال IRT از نوع checking/savings/other را می‌پذیرد؛ سقف amount/موجودی جدید همان Numeric(10,2) است. مرتبط: [[entities/invoice]]، [[entities/check]].
- `GET /accounts` با business_id اختیاری، ترتیب صعودی ID، skip>=0 و limit بین ۱ و ۱۰۰۰ (پیش‌فرض ۱۰۰)؛ after_id مثبت اختیاری فقط IDهای بزرگ‌تر را برمی‌گرداند. پارامتر نامعتبر ۴۲۲؛ مالکیت و فیلتر کسب‌وکار در همه صفحات حفظ می‌شود.
- `getAllAccounts` صفحات را با after_id برای میز تصمیم کامل می‌گیرد؛ خطای صفحه بعد/ID نامرتب کل load را رد می‌کند. فهرست‌های قبلی API همچنان getAccounts صفحه اول هستند. پیمایش snapshot اتمیک نیست.
- فرم ایجاد، کسب‌وکارهای مالک را از `GET /businesses/` می‌خواند؛ default یا تنها گزینه پیش‌انتخاب می‌شود و `business_id` مثبت و صحیح اجباری است. خطا/نبود کسب‌وکار ایجاد را متوقف می‌کند؛ تلاش دوباره برای خطای دریافت موجود است.
- ویرایش حساب business_id را تغییر نمی‌دهد و به دریافت فهرست کسب‌وکار وابسته نیست.
- schema پاسخ فرانت‌اند balance را به‌صورت عدد یا رشته decimal معتبر می‌پذیرد و به عدد finite تبدیل می‌کند؛ null/رشته خالی/مقدار نامعتبر رد می‌شود.
- تست schema و احراز هویت بدون بک‌اند زنده اجرا شده است.

## منابع فرانت‌اند
- `frontend/components/forms/AccountForm.tsx:50` — بارگذاری کسب‌وکار؛ `:103` — payload ایجاد.
- `frontend/lib/schemas/account.ts:28` — business_id اجباری هنگام ایجاد.
- `frontend/lib/api.ts` — getBusinesses و createAccount نوع‌دار.
- `frontend/lib/__tests__/auth-onboarding.test.ts:1` — اعتبارسنجی payload و balance.

## منابع کد
- `backend/app/api/v1/accounts.py:19` و `backend/app/services/accounts_service.py:20` — cursor و ترتیب؛ `backend/tests/test_business_api.py:126` — حذف مرز صفحه/مالکیت/پارامترها.
- `backend/app/services/accounts_service.py:54` — محافظ سابقه تسویه در ویرایش/حذف؛ `backend/tests/test_settlement_api.py:1` — تست محافظ‌ها.
- `pishbin/backend/app/models/account.py`
- `pishbin/backend/app/services/accounts_service.py`
- `pishbin/backend/app/api/v1/accounts.py`
