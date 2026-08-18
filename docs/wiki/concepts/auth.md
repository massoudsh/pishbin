# Auth Flow

> احراز هویت مبتنی بر JWT با پشتیبانی 2FA اختیاری (TOTP).

## Flow
1. `POST /auth/register` → ساخت [[entities/user]] با پسورد bcrypt-hash شده
2. `POST /auth/login` (OAuth2PasswordRequestForm) → اگر `totp_enabled` باشد، به‌جای access token یک `2fa_pending` token کوتاه‌مدت (۵ دقیقه) برمی‌گردد؛ در غیر این‌صورت مستقیم access+refresh token
3. `POST /auth/refresh` → صدور access token جدید از refresh token
4. `GET /auth/me` → اطلاعات کاربر جاری (وابسته به `get_current_user` dependency)
5. فراموشی/بازیابی پسورد: `forgot-password` (ایمیل با `create_reset_token`, یک‌ساعته) → `reset-password`

## انواع توکن (همه JWT با `SECRET_KEY`/`ALGORITHM` از config)
- `access` — کوتاه‌مدت (`ACCESS_TOKEN_EXPIRE_MINUTES`, پیش‌فرض ۳۰ دقیقه)
- `refresh` — بلندمدت (`REFRESH_TOKEN_EXPIRE_DAYS`, پیش‌فرض ۷ روز)
- `reset` — یک‌ساعته، برای بازیابی پسورد
- `2fa_pending` — پنج‌دقیقه‌ای، فقط برای گام تایید 2FA

## نکته امنیتی مهم
`Settings._check_secret_key` در `config.py` مانع از اجرا با `SECRET_KEY` پیش‌فرض در حالت `DEBUG=false` می‌شود (raise ValueError) — یعنی production بدون تغییر SECRET_KEY بالا نمی‌آید.

## منابع کد
- `backend/app/core/security.py` — تولید/دیکد همه انواع توکن
- `backend/app/api/v1/auth.py` (۲۹۹ خط)
- `backend/app/dependencies.py` — `get_current_user`
- `frontend/components/ProtectedRoute.tsx`
