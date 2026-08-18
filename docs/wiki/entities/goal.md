# Goal

> هدف مالی کاربر (پس‌انداز، بازپرداخت بدهی، خرید، صندوق اضطراری، سایر) با پیشرفت `current_amount`/`target_amount`.

## وابستگی‌ها
- [[entities/user]] — مالک، cascade delete-orphan

## قراردادها / Edge cases
- `GoalType` enum: savings, debt_payoff, purchase, emergency_fund, other
- `GoalStatus` enum: active, completed, paused, cancelled — پیش‌فرض active

## منابع کد
- `backend/app/models/goal.py`
- `backend/app/services/goals_service.py`
- `frontend/components/forms/GoalForm.tsx`
