# Budget

> محدودیت هزینه دوره‌ای (هفتگی/ماهانه/سالانه) روی یک دسته‌بندی؛ پایه هشدارهای مصرف بودجه.

## مسئولیت‌ها
- تعریف سقف هزینه (`amount`) در بازه `period` با `start_date`/`end_date` اختیاری
- ورودی برای [[concepts هشدار]] مصرف بودجه (`alerts_service.py`, `BudgetAlerts.tsx` در فرانت)

## وابستگی‌ها
- [[entities/user]] — مالک
- `Category` — دسته اختیاری
- [[entities/transaction]] — مصرف واقعی در برابر بودجه محاسبه می‌شود (`budget_service.py`)

## قراردادها / Edge cases
- `BudgetPeriod` enum: weekly, monthly, yearly — پیش‌فرض monthly

## منابع کد
- `backend/app/models/budget.py`
- `backend/app/services/budget_service.py`, `alerts_service.py`
- `frontend/components/dashboard/BudgetAlerts.tsx`, `frontend/components/forms/BudgetForm.tsx`
