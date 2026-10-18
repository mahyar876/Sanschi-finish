# استقرار sanschii.ir (حداقل کار دستی)

## آنچه از قبل آماده است

- `render.yaml` — دو سرویس **sanschii-api** و **sanschii-web**
- ریپو: `https://github.com/mahyar876/Sanschi-finish`
- اسکریپت باز کردن لینک‌ها: `npm run deploy:open`

## فقط ۴ کار (یک بار)

### ۱. MongoDB Atlas (~۵ دقیقه)

1. [ثبت‌نام Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Free cluster بسازید.
3. Database Access → user + password
4. Network Access → **Allow access from anywhere** (`0.0.0.0/0`) برای شروع
5. Connect → Drivers → کپی `mongodb+srv://...`

### ۲. Render Blueprint (~۱۰ دقیقه)

1. [Render → Blueprint](https://dashboard.render.com/select-repo?type=blueprint)
2. GitHub را وصل کنید → ریپو **Sanschi-finish** → branch **main**
3. وقتی `MONGO_URI` خواست، همان connection string Atlas را بدهید.
4. Apply و صبر تا هر دو سرویس **Live** شوند.

**دادهٔ اولیه (یک بار):**  
Render → **sanschii-api** → **Shell**:

```bash
npm run seed
```

**ادمین (اختیاری):**

```bash
node create-admin.js
```

### ۳. دامنه در Render

| سرویس | Custom domain |
|--------|----------------|
| sanschii-api | `api.sanschii.ir` |
| sanschii-web | `sanschii.ir` و `www.sanschii.ir` |

Render برای هر کدام **CNAME** (یا A) می‌دهد.

### ۴. DNS در پنل خرید دامنه

همان رکوردها را در پنل `.ir` بگذارید. SSL خودکار Render است.

## تست

- `https://sanschii.ir` — صفحهٔ اصلی
- `https://api.sanschii.ir/api/health` — `"db": true`

## جایگزین فرانت: Vercel

اگر Render برای Next.js کند بود:

1. [vercel.com](https://vercel.com) → Import ریپو → Root Directory: **`web`**
2. Env: `NEXT_PUBLIC_API_URL=https://api.sanschii.ir` ، `NEXT_PUBLIC_SITE_URL=https://sanschii.ir`
3. Domain: `sanschii.ir` — DNS طبق Vercel

API همان Render بماند.

## بعداً

- زرین‌پال: `ZARINPAL_MERCHANT_ID` در Render (API)
- SMS: `SMS_ENABLED=true` + کاوه‌نگار
- امنیت: [`deploy-security-checklist-fa.md`](deploy-security-checklist-fa.md)
