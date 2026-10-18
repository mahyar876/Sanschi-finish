# امنیت رزرو همزمان (سانس‌چی)

## لایه‌های دفاع

1. **قفل اتمی روی `DailyAvailability`** — `tryAcquireLock` با `updateOne` و `$elemMatch`؛ فقط یک کاربر می‌تواند سانس را `locked` کند.
2. **آزاد کردن اتمی** — انقضا، لغو و خطای ساخت رزرو فقط همان سانس را با `updateOne` عوض می‌کنند. سند روزانه کامل `save` نمی‌شود تا قفل سانس دیگر پاک نشود.
3. **ایندکس یکتا روی `Reservation`** — `(pitch, date, slotIndex)` برای وضعیت‌های فعال (`pending_payment`, `confirmed`, …)؛ رزرو دوم خطای `11000` می‌گیرد و پاسخ ۴۰۹ است.
4. **قبل از قطعی شدن پرداخت** — `assertNoSlotBookingConflict` و بعد `confirmSlotBooked`. سانس اول رزرو می‌شود، بعد وضعیت پرداخت `successful` می‌شود. اگر پرداخت ثبت نشود، همان سانس دوباره آزاد می‌شود.
5. **تأیید دوباره همان رزرو** — اگر سانس از قبل برای همین `reservationId` رزرو شده باشد، `confirmSlotBooked` دوباره خطا نمی‌دهد.
6. **کیف پول** — کسر موجودی داخل تراکنش و فقط یک‌بار برای هر رزرو (`payment.walletAmount`). اگر تأیید سانس شکست بخورد، مبلغ برمی‌گردد. لغو با سیاست بازپرداخت برای پرداخت کیف‌پولی **همان لحظه** به کیف پول برمی‌گردد (بدون انتظار درگاه).
7. **محدودیت نرخ** — `RATE_LIMIT_RESERVATION_MAX` (پیش‌فرض ۲۰ در دقیقه برای هر کاربر) روی ساخت رزرو، و `RATE_LIMIT_PAY_MAX` (پیش‌فرض ۱۵) روی پرداخت.

## تست

```bash
cd backend
npm run dev   # ترمینال جدا
npm run test:concurrent-booking   # انتظار: ۱×201 و بقیه 409
npm run test:flow-smoke
npm run security:smoke
```

## توصیه production

- MongoDB به‌صورت replica set (Atlas) تا تراکنش کیف پول کار کند.
- مانیتور پاسخ ۴۰۹ روی `/api/reservations`.
- `ALLOW_MOCK_PAY` در محیط واقعی روشن نباشد.
