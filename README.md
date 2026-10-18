# سانس‌چی (reserve-football)

رزرو آنلاین چمن فوتبال، سالن فوتسال و والیبال.

## ساختار

| پوشه | توضیح |
|------|--------|
| `web/` | فرانت **Next.js 15** (نسخهٔ اصلی UI) |
| `frontend/` | HTML قدیمی (legacy) |
| `backend/` | API **Express** + MongoDB |

## لوکال (حالت اصلی)

**۱) MongoDB** روی همین سیستم (پورت 27017).

**۲) بک‌اند**

```bash
cd backend
cp .env.example .env   # یک بار — MONGO_URI را لوکال بگذار
npm install
npm run dev
```

نمونه در `.env`:

```env
MONGO_URI=mongodb://localhost:27017/sanschii
```

**۳) فرانت**

```bash
cd web
npm install
npm run dev
```

در `web/.env.local` (پیش‌فرض):

- `NEXT_PUBLIC_DEMO_MODE=false` — API واقعی
- `NEXT_PUBLIC_API_URL` خالی — در dev درخواست‌های `/api` به `http://localhost:5000` پروکسی می‌شوند

- سایت: http://localhost:3000  
- API: http://localhost:5000  
- سلامت API: http://localhost:3000/api/health  

**ورود:** ثبت‌نام با موبایل + رمز؛ OTP پیامک ندارد — کد روی صفحهٔ ورود نشان داده می‌شود (یا در ترمینال بک‌اند).

## GitHub

ریپو: `mahyar876/Sanschii-finish` — فقط پشتیبان کد؛ اجرا لوکال است.

## استقرار آنلاین (sanschii.ir)

**راهنمای کوتاه:** [`docs/deploy-sanschii-ir-fa.md`](docs/deploy-sanschii-ir-fa.md)  
**باز کردن لینک‌های Atlas + Render:** `npm run deploy:open`

| لایه | پیشنهاد |
|------|---------|
| API + سایت | Render Blueprint — `render.yaml` (ریپو GitHub) |
| DB | MongoDB Atlas |
| فرانت (اختیاری) | Vercel — Root `web/` |

**فرانت (Vercel):** `NEXT_PUBLIC_API_URL` = آدرس عمومی API.  
**بک‌اند:** `CORS_ORIGINS` = دامنهٔ فرانت؛ `FRONTEND_URL` همان؛ `BASE_URL` = URL خود API.  
**بدون پیامک:** `SMS_ENABLED=false` — کاربران با **ایمیل + رمز** وارد می‌شوند؛ OTP در dev در لاگ سرور دیده می‌شود.  
**بدون درگاه:** تا تنظیم زرین‌پال، فقط لوکال با `ALLOW_MOCK_PAY=true` (در production حتماً `false`).

دادهٔ اولیه روی سرور **خودکار seed نمی‌شود** — یک بار: `cd backend && npm run seed` (یا `npm run seed:full`).

چک‌لیست امنیت و پنل: [`docs/deploy-security-checklist-fa.md`](docs/deploy-security-checklist-fa.md)

```bash
npm run build:web          # بیلد فرانت
cd backend && npm run security:smoke   # با API روشن
```
