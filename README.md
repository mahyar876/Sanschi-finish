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

### فرانت (Vercel)

Root directory: **`web`**

متغیر اختیاری:

- `NEXT_PUBLIC_API_URL` = آدرس بک‌اند (مثلاً `https://xxx.onrender.com`)

### بک‌اند (Render / Railway)

Root: **`backend`**, دستور: `npm start`

متغیرها: `MONGO_URI`, `JWT_SECRET`, `PORT=5000`
