# Cashflow Forecast

> موتور پیش‌بینی مالی — هستهٔ ارزش پیشنهادی محصول («اثر تصمیم امروز روی ۳۰ روز آینده نقدینگی»). حالا یک تابع ترکیبی یکپارچه دارد؛ مدل پایه («رویدادهای قطعی + روند تاریخی») قبل از رفتن سراغ ML سنگین (طبق ایشو #49).

## وضعیت فعلی پیاده‌سازی
`ForecastService.forecast_monthly_expenses(user_id, months=3)`:
- میانگین هزینه [[entities/transaction]] از ۶ ماه اخیر (`type=EXPENSE`) را حساب می‌کند و flat برای N ماه آینده تکرار می‌کند (بدون ترند/فصلی‌بودن) — همچنان ساده، مصرف قدیمی

`ForecastService.get_upcoming_check_events(user_id, days=30)`:
- [[entities/check]] با `status=pending` و `due_date` در بازه — رویداد نقدی **شناخته‌شده** (نه تخمینی)
- خروجی: `{ events[], total_inflow (دریافتی), total_outflow (صادره), net }`

`ForecastService.get_upcoming_invoice_events(user_id, days=30)` **(جدید)**:
- [[entities/invoice]] با `status ∈ {issued, overdue}` و `due_date <= today+days` — مطالبات آینده به‌عنوان inflow شناخته‌شده
- خروجی: `{ events[] (هرکدام با `overdue: bool`), total_inflow }`

`ForecastService.get_cash_flow_forecast(user_id, days=30)` **(جدید — موتور یکپارچه)**:
- `current_balance` = مجموع `Account.balance` فعال (همان الگوی ساده‌ی `ReportsService.get_dashboard_summary`، بدون تبدیل ارز)
- `known_events_net` = `check_events.net + invoice_events.total_inflow`
- `trend_net` = میانگین روزانهٔ (درآمد−هزینه) [[entities/transaction]] در ۹۰ روز اخیر × `days` (روند تاریخی برای بخشی که رویداد قطعی ندارد)
- `projected_net = known_events_net + trend_net` و `projected_balance = current_balance + projected_net`
- مصرف‌شده در `GET /dashboard/cash-flow-forecast` (و به‌صورت جزئی در `GET /invoices/cash-flow-forecast`)

**⚠ شکاف باقی‌مانده:** رفتار پرداخت [[entities/customer]] (امتیاز تأخیر/برگشتی) هنوز مستقیماً در `trend_net`/`known_events_net` وزن‌دهی نمی‌شود؛ فقط به‌صورت مجزا در `CustomerService.get_customer_score` قابل مشاهده است. ML واقعی (LSTM/ARIMA طبق ایشو #49) هنوز پیاده نشده — این فقط مدل پایهٔ قبل از آن است.

## هشدار زودهنگام کسری نقدینگی
`AlertsService.get_cash_flow_alerts(user_id, days=30, threshold=0)` **(جدید)**:
- روی `get_cash_flow_forecast` سوار است؛ اگر `projected_balance < threshold` → یک آلارم برمی‌گرداند (`alert_type: critical` اگر `current_balance` هم‌اکنون زیر آستانه باشد، وگرنه `warning`)
- الگو مشابه هشدار بودجهٔ موجود (`get_budget_alerts`، آستانهٔ ≥۸۰٪) ولی رو به جلو (forward-looking)
- `GET /alerts/cash-flow` — مصرف‌شده در `CashFlowAlert.tsx` روی داشبورد

## وابستگی‌ها
- [[entities/transaction]] — منبع دادهٔ `forecast_monthly_expenses` و `trend_net`
- [[entities/check]] — منبع دادهٔ `get_upcoming_check_events`
- [[entities/invoice]] — منبع دادهٔ `get_upcoming_invoice_events`
- [[entities/account]] — منبع `current_balance`

## منابع کد
- `backend/app/services/forecast_service.py`
- `backend/app/services/alerts_service.py` (`get_cash_flow_alerts`)
- `backend/app/api/v1/dashboard.py` (`/dashboard/cash-flow-forecast`)
- `backend/app/api/v1/alerts.py` (`/alerts/cash-flow`)
- `frontend/components/dashboard/CashFlowAlert.tsx`
- `backend/app/services/metrics_service.py`, `reports_service.py` — گزارش‌های مرتبط دیگر
