# Bank Reconciliation

> آشتی‌سازی خودکار صورت‌حساب بانکی — تطبیق ردیف‌های یک فایل CSV صورت‌حساب بانک با [[entities/transaction]] های ثبت‌شده، بدون هیچ نوشتنی روی دیتابیس (read-only). پاسخ به issue #53؛ الگوبرداری از `check_possible_duplicate` موجود در `transactions_service.py`.

## جریان کار
`ReconciliationService.reconcile(user_id, account_id, rows, window_days=3)`:
1. مالکیت `account_id` روی `user_id` را چک می‌کند؛ در غیر این صورت `ValueError("Account not found")` → `404`.
2. هر ردیف CSV (ستون‌های `date,amount,type,description`) را با همان منطق پارس `import_from_rows` می‌خواند؛ ردیف‌های نامعتبر (تاریخ/مبلغ/نوع غلط) در `row_errors` جمع می‌شوند و کل درخواست را fail نمی‌کنند.
3. تراکنش‌های همان کاربر/حساب را در بازهٔ `[min(row.date) - window, max(row.date) + window]` می‌خرد.
4. تطبیق حریصانه (greedy): برای هر ردیف، در بین تراکنش‌های استفاده‌نشده با همان `transaction_type` و `amount` دقیقاً برابر، نزدیک‌ترین تاریخ در بازهٔ `window_days` انتخاب می‌شود؛ هر تراکنش حداکثر یک‌بار در هر اجرا مصرف می‌شود (`used_transaction_ids`).
5. ردیف‌های بی‌تطبیق در `unmatched` با یک `reason` گزارش می‌شوند.

خروجی: `{ account_id, total_rows, matched_count, unmatched_count, matches[], unmatched[], row_errors[] }` — هیچ [[entities/transaction]] ای ساخته/ویرایش/حذف نمی‌شود (چند تست backend همین رفتار read-only را assert می‌کنند).

## Endpoint
`POST /api/v1/reconciliation/bank-statement?account_id={id}&window_days=3` — آپلود multipart فایل CSV (فیلد `file`)، همان الگوی `POST /transactions/import` (decode با fallback utf-8 → latin-1).

## وابستگی‌ها
- [[entities/account]] — چک مالکیت قبل از آشتی‌سازی
- [[entities/transaction]] — منبع مقایسه؛ فیلترشده بر اساس `account_id + transaction_type + amount + date window`

## منابع کد
- `backend/app/services/reconciliation_service.py`
- `backend/app/schemas/reconciliation.py`
- `backend/app/api/v1/reconciliation.py`
- `backend/tests/test_reconciliation_api.py` — ۵ تست (تطبیق دقیق، تطبیق در بازهٔ روز، گزارش بی‌تطبیق، مالکیت حساب، read-only بودن)
- `frontend/app/reconciliation/page.tsx` — فرم آپلود CSV + نمایش نتایج تطبیق‌یافته/نیافته
