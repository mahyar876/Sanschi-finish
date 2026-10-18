# گزارش نهایی امن‌سازی سانس‌چی

شاخه: `security/hardening`  
تاریخ: ۱۴۰۴/۰۷/۲۰

## ۱. مشکلاتی که پیدا و اصلاح شدند

| حوزه | اصلاح |
|------|--------|
| مدیریت زمین | `adminSecret` همیشه JWT ادمین می‌خواهد؛ `pickPitchFields` против mass assignment |
| مالی / مالک | حذف `commissionAmount` از PATCH مالک؛ تأیید دستی `paid` فقط با `ALLOW_OWNER_MANUAL_PAY`؛ مسیر مجاز از `confirmReservationPayment` |
| CORS / هدرها | `CORS_ORIGINS`، Helmet، `X-Request-Id` |
| OTP | MongoDB (`OtpChallenge`)، HMAC، ۶ رقم، rate limit، anti-enumeration |
| پرداخت | مبلغ/مالکیت از DB؛ تأیید اتمی؛ فیلتر `user` در request زرین‌پال |
| پنالتی | نشست `PenaltyGameSession` + `sessionId` یک‌بارمصرف + حداقل زمان بازی (prod) |
| پایداری | `/api/health` با 503 بدون DB؛ `/api/health/live` |
| فرانت | OTP ۶ رقمی؛ `uiPreview` فقط غیر production |
| وابستگی‌ها | `helmet`؛ ارتقای `nodemailer` (۳ high باقی در audit — بررسی دستی) |
| مستندات | `deploy-security-checklist-fa.md`، `render.example.yaml` |
| رزرو همزمان | قفل اتمی سانس، ایندекс یکتا، `assertNoSlotBookingConflict`، rate limit رزرو/پرداخت، تست `test:concurrent-booking` |
| پشتیبانی | API تیکت + پنل بازیکن/ادمین |

## ۲. آزمون‌های اجراشده

```text
npm run security:smoke        → ۱۱/۱۱ PASS (با API روشن)
npm run test:concurrent-booking → ۱×۲۰۱ و بقیه ۴۰۹
npm run test:flow-smoke       → register → reserve → mock pay
```

شامل: health، admin بدون توکن، pitches/reservations/support بدون auth، CORS، OTP، پنالتی session.

**اجرا نشده (نیاز sandbox/دستی):** callback زرین‌پال، restore Atlas.

## ۳. کارهای پنل / خارج از کد

- Render: env طبق `render.example.yaml` و `backend/.env.example`
- Atlas: IP allowlist، backup، تست restore
- SMS: `SMS_ENABLED=true` + کلید کاوه‌نگار
- CDN/WAF برای DDoS لایه شبکه
- rotate secrets اگر قبلاً در Git بوده

## دستورات

```bash
cd backend && npm start
npm run security:smoke
```
