# User

> کاربر سیستم (صاحب کسب‌وکار)؛ ریشه تمام روابط مالی (حساب، تراکنش، بودجه، هدف، پرداخت، ...).

## مسئولیت‌ها
- احراز هویت (ایمیل/یوزرنیم + پسورد bcrypt)
- نگهداری `dashboard_preferences` (JSON: widget_ids + order) برای شخصی‌سازی داشبورد
- پشتیبانی 2FA اختیاری از طریق `totp_secret` (pyotp) — `totp_enabled` property

## وابستگی‌ها
- [[concepts/auth]] — flow کامل لاگین/2FA/refresh/reset
- [[entities/business]] — کاربر می‌تواند چند Business (کسب‌وکار/شعبه) داشته باشد؛ اولی خودکار روی register ساخته می‌شود؛ cascade delete-orphan
- [[entities/account]], [[entities/transaction]], [[entities/budget]], [[entities/goal]] — cascade delete-orphan روی همه
- [[entities/api-key]] — کلیدهای برنامه‌نویسی کاربر
- [[entities/banking-message]], [[entities/payment]], [[entities/recurring-transaction]]

## قراردادها / Edge cases
- `email` و `username` هر دو unique و nullable=False
- حذف User → حذف کاسکیدی همه entityهای وابسته (businesses, accounts, transactions, budgets, goals, banking_messages, payments, recurring_transactions, api_keys)
- `is_superuser` برای دسترسی ادمین (مصرف دقیق آن در schemas/api لازم است بررسی شود اگر feature جدید نیاز دارد)

## منابع کد
- `backend/app/models/user.py` — مدل اصلی
- `backend/app/api/v1/auth.py` — register/login/refresh/me/forgot-password/reset-password (۲۹۹ خط)
- `backend/app/core/security.py` — هش پسورد و JWT
