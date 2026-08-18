# Business

> کسب‌وکار/شعبه (workspace) بین User و Account؛ هر کاربر می‌تواند چند Business داشته باشد و بین آن‌ها سوییچ کند. جواب به issue #52 (multi-business).

## مسئولیت‌ها
- مالکیت مجموعه‌ای از `Account`ها (هر Account دقیقاً به یک Business تعلق دارد)
- `is_default` مشخص می‌کند کدام Business «فعال/سوییچ‌شده» کاربر است (دقیقاً یکی از Businessهای هر کاربر باید default باشد)
- ثبت‌نام کاربر جدید → یک Business پیش‌فرض به‌صورت خودکار ساخته می‌شود (`auth.py` → `register`)

## وابستگی‌ها
- [[entities/user]] — مالک (`owner_id`)، `cascade="all, delete-orphan"` روی حذف User
- [[entities/account]] — هر Account یک `business_id` اجباری دارد (nullable=False)

## قراردادها / Edge cases
- اولین Business ساخته‌شده برای هر کاربر خودکار `is_default=True` می‌شود
- سوییچ Business فعال: `POST /businesses/{id}/set-default` (همه‌ی Businessهای دیگر کاربر `is_default=False` می‌شوند)
- حذف Business مسدود است اگر: (۱) تنها Business کاربر باشد، یا (۲) هنوز Accountی داشته باشد — باید اول Accountها منتقل/حذف شوند
- ساخت/دیدن Account همیشه مالکیت `business_id` را روی owner فعلی چک می‌کند (404 اگر متعلق به کاربر دیگر باشد) — در `accounts.py` endpoint، نه در service
- سایر entityهای مالی (Transaction, Budget, Goal, ...) هنوز مستقیماً `business_id` ندارند — فقط از طریق `Account` به Business مرتبط‌اند (scope فاز اول issue #52؛ فاز بعد می‌تواند گزارش تجمیعی چندکسب‌وکاری اضافه کند)

## منابع کد
- `backend/app/models/business.py`
- `backend/app/services/business_service.py`
- `backend/app/api/v1/businesses.py`
- `backend/alembic/versions/20260809_add_businesses.py` — migration + backfill کاربران قدیمی
- `backend/app/api/v1/auth.py` → `register()` — ساخت Business پیش‌فرض
