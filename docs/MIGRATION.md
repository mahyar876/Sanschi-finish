# مهاجرت سانس‌چی → Next.js

## تصمیم‌ها

| لایه | الان | بعداً |
|------|------|--------|
| فرانت | **`web/`** — Next.js 15 (App Router) + TypeScript | جایگزین کامل `frontend/` |
| API | **`backend/`** — Express + Mongoose | NestJS یا Express+TS (بعداً) |
| Vue | — | برای **بک‌اند** استفاده نمی‌شود؛ اگر Vue بخواهی = Nuxt (فرانت+API) |

## اجرای لوکال

```bash
# ترمینال ۱ — API
cd backend
npm run dev

# ترمینال ۲ — Next
cd web
npm install
npm run dev
```

Next روی `http://localhost:3000` — درخواست‌های `/api/*` به `localhost:5000` پروکسی می‌شوند (`next.config.ts`).

## ترتیب انتقال صفحات (پیشنهاد)

1. خانه، layout، header، استایل پایه ✅ (شروع)
2. gallery + reserve (هسته محصول)
3. login / profile / payment
4. owner / finance / settlement
5. admin / admin-finance
6. penalty, about (اختیاری)

## دیploy آنلاین (بعد از تکمیل)

- **Backend:** Render/Railway + MongoDB Atlas
- **Frontend:** Vercel یا Render — `NEXT_PUBLIC_API_URL=https://api.example.com`
- یا یک سرور Express که Next را `next start` هم سرو کند

## کمیسیون (فاز ارائه)

- `commissionAmount` روی Pitch — پیش‌فرض **۰**
- UI مالک/ادمین: ستون «کارمزد پلتفرم» همیشه visible
