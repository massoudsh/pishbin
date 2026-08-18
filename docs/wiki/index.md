# Index

## Overview
- [[overview]] — پیش‌بین (Pishbin): کوپایلوت مالی SME ایرانی، پشته FastAPI + Next.js

## Entities (13 صفحه)
- [[entities/user]] — کاربر، ریشه همه روابط مالی، JWT auth، 2FA
- [[entities/business]] — کسب‌وکار/شعبه (multi-business workspace)؛ بین User و Account
- [[entities/account]] — حساب مالی (چک‌جاری/پس‌انداز/کارت/سرمایه‌گذاری/وام)، اجباراً متعلق به یک Business
- [[entities/transaction]] — تراکنش درآمد/هزینه/انتقال؛ ورودی اصلی گزارش و پیش‌بینی
- [[entities/budget]] — سقف هزینه دوره‌ای روی دسته‌بندی
- [[entities/goal]] — هدف مالی کاربر بزرگسال
- [[entities/payment]] — پرداخت درگاه زرین‌پال
- [[entities/banking-message]] — پیام خام بانکی برای تبدیل به تراکنش
- [[entities/recurring-transaction]] — قالب تراکنش دوره‌ای
- [[entities/api-key]] — کلید دسترسی برنامه‌نویسی
- [[entities/check]] — چک صادره/دریافتی، وضعیت وصول، ورودی [[concepts/forecast]]، لینک اختیاری به [[entities/customer]]
- [[entities/customer]] — مشتری؛ امتیاز رفتار پرداخت (تأخیر فاکتور + نرخ چک برگشتی)
- [[entities/invoice]] — فاکتور/مطالبهٔ آینده از مشتری؛ ورودی دوم [[concepts/forecast]]

## Concepts (4 صفحه)
- [[concepts/auth]] — flow کامل JWT (access/refresh/2FA/reset)
- [[concepts/forecast]] — موتور یکپارچهٔ پیش‌بینی نقدینگی (رویدادهای چک+فاکتور + روند تاریخی) و هشدار زودهنگام کسری نقدینگی
- [[concepts/reconciliation]] — آشتی‌سازی خودکار صورت‌حساب بانکی (CSV) با تراکنش‌های ثبت‌شده، read-only
- [[concepts/deployment]] — Docker Compose dev/prod، nginx، env vars
