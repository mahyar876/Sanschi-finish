# چک‌لیست استقرار امن سانس‌چی

این سند کارهایی را فهرست می‌کند که **باید در پنل میزبانی** (Render، MongoDB Atlas، GitHub، DNS) انجام شوند؛ اصلاحات کد به‌تنهایی کافی نیست.

## MongoDB Atlas

- [ ] کاربر دیتابیس با حداقل دسترسی (`readWrite` فقط روی دیتابیس اپ)
- [ ] TLS فعال (پیش‌فرض Atlas)
- [ ] Network Access: فقط IPهای مجاز — برای Render از **Static Outbound IP** (پلن پولی) یا **Private Link/VPC Peering** استفاده کنید؛ از `0.0.0.0/0` در production خودداری کنید مگر موقت برای تست
- [ ] `MONGO_URI` فقط در متغیرهای محیط Render (هرگز در فرانت یا GitHub)
- [ ] پشتیبان‌گیری Cloud Backup Atlas با retention مناسب
- [ ] هر ۳–۶ ماه یک **بازیابی آزمایشی** روی کلاستر staging

## رزرو همزمان (کد + مانیتور)

- [ ] MongoDB Atlas به‌صورت replica set (برای تراکنش کیف پول)
- [ ] `ALLOW_MOCK_PAY=false` در production
- [ ] مانیتور spike پاسخ **409** روی `POST /api/reservations`
- [ ] تست دوره‌ای: `npm run test:backend:integration` (API + seed) — راهنما: [`concurrent-booking-security-fa.md`](concurrent-booking-security-fa.md)

## Render (بک‌اند)

- [ ] `NODE_ENV=production`
- [ ] `JWT_SECRET` تصادفی ≥ ۳۲ کاراکتر (یکبار تولید و rotate در نشت)
- [ ] `CORS_ORIGINS` = دامنه(های) واقعی فرانت (GitHub Pages / Vercel / …)
- [ ] `ZARINPAL_SANDBOX=false` و `ZARINPAL_MERCHANT_ID` تولید
- [ ] `ALLOW_MOCK_PAY=false` ، `ALLOW_MOCK_REFUND=false`
- [ ] `ALLOW_OWNER_MANUAL_PAY=false` (مگر سیاست کسب‌وکار صریح)
- [ ] `SMS_ENABLED=true` و کلید کاوه‌نگار در env
- [ ] Health check: `/api/health` (readiness) و `/api/health/live` (liveness)
- [ ] لاگ Render را برای خطاهای ۵xx پایش کنید

## فرانت (Next.js — Vercel / Render / Node)

- [ ] `npm run build` در پوشهٔ `web` بدون خطا
- [ ] هیچ `NEXT_PUBLIC_*` حاوی secret نباشد (Maps API key با محدودیت HTTP referrer)
- [ ] `NEXT_PUBLIC_API_URL` فقط آدرس عمومی API (روی Vercel الزامی)
- [ ] `NEXT_PUBLIC_SITE_URL` = دامنهٔ canonical (sitemap/robots)
- [ ] HTTPS اجباری روی دامنه

## DNS / لبه

- [ ] CDN/WAF (مثلاً Cloudflare) برای محدودیت نرخ لایه شبکه و DDoS — Express به‌تنهایی کافی نیست
- [ ] HSTS روی دامنه فرانت

## پس از نشت احتمالی secret در Git

- [ ] کلید را **rotate** کنید (JWT، درگاه، SMS، MongoDB user password)
- [ ] تاریخچه مخزن را با `git log` / GitHub Secret scanning بررسی کنید
- [ ] history rewrite فقط با تأیید صریح و برنامه rollback

## پشتیبان و بازیابی

| مورد | پیشنهاد |
|------|---------|
| روش | Atlas Continuous Backup یا snapshot زمان‌بندی‌شده |
| تناوب | روزانه (حداقل) برای داده مالی/رزرو |
| محل | فقط Atlas / storage خصوصی — نه repo عمومی |
| تست بازیابی | فصلانه restore روی staging و sanity check رزرو/پرداخت |
