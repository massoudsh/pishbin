# Banking Message

> پیام خام بانکی (پیامک/push/ایمیل) که برای تبدیل به [[entities/transaction]] پارس می‌شود — نزدیک‌ترین entity به پوزیشنینگ جدید محصول (ورود خودکار داده مالی به‌جای ثبت دستی).

## مسئولیت‌ها
- نگهداری `raw_text` + منبع (`source`: sms/push/email)
- فیلدهای parsed: `parsed_amount`, `parsed_date`, `parsed_description`, `parsed_type` (income/expense)
- پیشنهاد دسته‌بندی خودکار (`suggested_category_id`)
- وقتی کاربر تایید کرد → `transaction_id` ست می‌شود (لینک به تراکنش واقعی ساخته‌شده)

## وابستگی‌ها
- [[entities/user]]
- [[entities/transaction]] — مقصد تبدیل
- `Category` — پیشنهاد دسته

## منابع کد
- `backend/app/models/banking_message.py`
- `backend/app/services/banking_message_service.py`
- `backend/app/api/v1/banking_messages.py`
- `frontend/app/banking-messages/page.tsx`, `connect-bank/page.tsx`
