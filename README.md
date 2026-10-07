# سانس‌چی (reserve-football)

رزرو آنلاین چمن فوتبال، سالن فوتسال و والیبال.

## ساختار

| پوشه | توضیح |
|------|--------|
| `web/` | فرانت **Next.js 15** (نسخهٔ اصلی UI) |
| `frontend/` | HTML قدیمی (legacy) |
| `backend/` | API **Express** + MongoDB |

## لوکال

```bash
cd backend && npm install && npm run dev
cd web && npm install && npm run dev
```

- Next: http://localhost:3000  
- API: http://localhost:5000  

## Deploy

### فرانت (Vercel) — صفحهٔ خانه همین `web/` است

1. در [vercel.com](https://vercel.com) پروژه را از همین ریپو import کن.
2. **Root Directory** را حتماً **`web`** بگذار (اگر خالی بماند، هوم Next اصلاً build نمی‌شود).
3. Deploy بزن؛ آدرس موقت: `https://xxx.vercel.app` — مسیر `/` همان صفحهٔ خانهٔ جدید است.
4. دامنهٔ `sanschi.ir` را در Vercel → Domains اضافه کن (DNS را به Vercel بده، نه به بک‌اند Render).

**CLI (بعد از `npx vercel login` داخل پوشه `web`):**

```bash
cd web
npx vercel --prod
```

یا از ریشهٔ ریپو: `npm run deploy:web`

متغیر اختیاری (فقط وقتی API داری):

- `NEXT_PUBLIC_API_URL` = آدرس بک‌اند

**نکته:** اگر دامنه الان به بک‌اند Express وصل است، ممکن است خطای ۵۰۰ ببینی — آن سرو HTML قدیمی `frontend/` است، نه هوم Next.

### بک‌اند (Render / Railway)

Root: **`backend`**, دستور: `npm start`

متغیرها: `MONGO_URI`, `JWT_SECRET`, `PORT=5000`
