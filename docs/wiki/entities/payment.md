# Payment (ZarinPal Gateway)

> رکورد جریان پرداخت درگاه زرین‌پال: request → redirect → callback verify.

## مسئولیت‌ها
- ذخیره `authority` (از درخواست زرین‌پال) و `ref_id` (از verify موفق)
- `amount_rials` با دقت بالا (Numeric 14,0) چون زرین‌پال ریال کار می‌کند
- `status`: pending | completed | failed | cancelled

## وابستگی‌ها
- [[entities/user]] — مالک پرداخت

## قراردادها / Edge cases
- `gateway` پیش‌فرض `"zarinpal"` — طراحی برای پشتیبانی درگاه‌های دیگر در آینده باز است
- `extra_data` فیلد JSON آزاد (ایمیل/موبایل) برای درخواست زرین‌پال

## منابع کد
- `backend/app/models/payment.py`
- `backend/app/services/zarinpal_service.py`
- `backend/app/api/v1/payments.py`
- `frontend/app/payments/page.tsx`
