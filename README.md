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

## Deploy (رایگان — برای دیگران روی اینترنت)

سه سرویس رایگان: **GitHub** (کد) + **MongoDB Atlas** (دیتابیس) + **Render** (API) + **Vercel** (سایت).

### ۰) کد را روی GitHub بگذار

اگر هنوز remote نداری، یک repo خصوصی/عمومی بساز و push کن (GitHub Desktop یا `gh repo create`).

### ۱) MongoDB Atlas (رایگان M0)

1. [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas) → Cluster رایگان بساز.
2. Database Access → کاربر با رمز قوی.
3. Network Access → **Allow access from anywhere** (`0.0.0.0/0`) تا Render وصل شود.
4. Connect → Connection string → جای `<password>` رمز را بگذار.  
   مثال: `mongodb+srv://user:PASS@cluster0.xxxxx.mongodb.net/sansyar?retryWrites=true&w=majority`

### ۲) API روی Render (رایگان)

1. [render.com](https://render.com) → **New** → **Blueprint** (یا Web Service از GitHub).
2. همین repo را انتخاب کن؛ فایل **`render.yaml`** در ریشه Blueprint را می‌خواند.
3. متغیرهای دستی:
   - `MONGO_URI` = رشته Atlas
   - بعد از اولین deploy: `BASE_URL` = `https://sanschi-api.onrender.com` (همان URL سرویس Render)
   - `FRONTEND_URL` = بعداً آدرس Vercel (مثلاً `https://sanschi.vercel.app`)
4. Deploy. Health: `https://YOUR-API.onrender.com/api/health` باید `{"success":true,"db":true}` بدهد.

**نکته:** پلن رایگان Render بعد از چند دقیقه بیکاری **sleep** می‌کند؛ اولین بازدید ~۳۰–۶۰ ثانیه طول می‌کشد.

### ۳) فرانت روی Vercel (رایگان)

1. [vercel.com](https://vercel.com) → Import از GitHub.
2. **Root Directory = `web`** (خیلی مهم).
3. Environment Variables (Production):

| نام | مقدار |
|-----|--------|
| `NEXT_PUBLIC_API_URL` | `https://YOUR-API.onrender.com` (بدون `/` آخر) |
| `NEXT_PUBLIC_DEMO_MODE` | `false` |

4. Deploy → لینک `https://xxx.vercel.app` را به دوستان بده.

5. در Render دوباره `FRONTEND_URL` را همان آدرس Vercel بگذار (برای ریدایرکت پرداخت).

**CLI:** `cd web && npx vercel --prod` یا از ریشه: `npm run deploy:web`

### ورود کاربران بدون SMS (فعلاً)

- **ثبت‌نام** با نام + موبایل + رمز (حداقل ۸ کاراکتر) — برای کاربر جدید.
- **ورود با موبایل:** فقط اگر قبلاً ثبت‌نام کرده باشد؛ تا Kavenegar وصل نشود، **کد OTP روی همان صفحهٔ ورود** نشان داده می‌شود (نه پیامک).

### بعداً (اختیاری)

- دامنهٔ خودت (مثلاً `sanschi.ir`) → Vercel → Domains + DNS.
- `SMS_ENABLED=true` و `KAVENEGAR_API_KEY` در Render برای OTP واقعی.
- `ZARINPAL_MERCHANT_ID` برای پرداخت واقعی.

**نکته:** Express روی Render فقط API است؛ صفحهٔ اصلی سایت همیشه Vercel (`web/`) است.
