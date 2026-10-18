# Handoff — کارهای باقی‌مانده (خارج از کد)

این موارد **کلید/API/محتوا** می‌خواهند؛ در repo automate نشده‌اند.

## استقرار

1. Merge `security/hardening` → `main` (یا PR باز کن).
2. Render: env طبق `backend/.env.example` و `docs/deploy-security-checklist-fa.md`.
3. Vercel (web): `NEXT_PUBLIC_API_URL` = URL عمومی API؛ `NEXT_PUBLIC_SITE_URL=https://sanschii.ir`.
4. MongoDB Atlas + IP allowlist + backup.

## سرویس‌های خارجی

| سرویس | env |
|--------|-----|
| SMS (کاوه‌نگار) | `SMS_ENABLED=true` + کلید |
| زرین‌پال | `ZARINPAL_MERCHANT_ID`، `ZARINPAL_SANDBOX=false` در prod |
| production pay | `ALLOW_MOCK_PAY=false` |

## محتوا

- زمین‌های واقعی (به‌جای seed دمو)، عکس، lat/lng، قیمت.
- ادمین → تنظیمات سایت: تلفن و ایمیل پشتیبانی.

## تست QR با گوشی (dev)

در `web/.env.local`:

```env
NEXT_PUBLIC_SITE_URL=http://192.168.x.x:3000
```

## پرامپت برای چت بعدی Cursor

```
پروژه reserve-football — شاخه security/hardening.
کارهای کد لوکال انجام شده (تیکت مالک، ماشین‌حsاب بدون کارت، پنالتی، CI، E2E).
لطفاً فقط این‌ها را انجام بده:
1) راه‌اندازی sanschii.ir طبق docs/handoff-launch-fa.md و deploy-security-checklist-fa.md
2) بعد از دریافت کلید SMS و زرین‌پال، env production را ست کن و callback درگاه را تست کن
3) seed واقعی / ورود زمین‌های مالک
```
