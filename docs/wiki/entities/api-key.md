# API Key

> کلید دسترسی برنامه‌نویسی برای کاربر؛ برای مصرف API خارج از session مرورگر (مثلاً یکپارچه‌سازی/اتوماسیون).

## مسئولیت‌ها
- کلید فقط به‌صورت هش (SHA-256 با تابع `hash_key`) ذخیره می‌شود — مقدار plain هرگز persist نمی‌شود
- `last_used_at` برای ردیابی مصرف

## وابستگی‌ها
- [[entities/user]] — `ondelete="CASCADE"` صریح روی FK (بر خلاف بقیه که با ORM cascade کار می‌کنند)

## منابع کد
- `backend/app/models/api_key.py`
- `backend/app/api/v1/api_keys.py`
