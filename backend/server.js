const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const rateLimit = require('express-rate-limit');

dotenv.config();

const app = express();

app.set('trust proxy', 1);

// ── MIDDLEWARE ──
app.use(
  cors({
    origin: '*',
    credentials: true,
  }),
);

app.use(express.json({ limit: '8mb' }));

// ── RATE LIMIT (production only — dev/preview hit /api heavily via Next proxy) ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'درخواست‌های زیاد؛ لطفاً چند دقیقه بعد دوباره تلاش کنید' },
});
if (process.env.NODE_ENV === 'production') {
  app.use('/api/', limiter);
}

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
});
// app.use('/api/auth/', authLimiter);

const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend/pages')));
app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));

// ── ROUTES ──
app.use('/api/auth', require('./routes/auth'));
app.use('/api/pitches', require('./routes/pitches'));
app.use('/api/reservations', require('./routes/reservations'));
app.use('/api/owner', require('./routes/owner')); // ← پنل صاحب زمین
app.use('/api/settlements', require('./settlements')); // ← تسویه مالی
app.use('/api/payment', require('./routes/payment'));
app.use('/api/notifications', require('./routes/notifications'));
app.use('/api/discounts', require('./routes/discounts'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/owner-applications', require('./routes/ownerApplications'));

// ── HEALTH ──
app.get('/api/health', (req, res) => {
  res.json({
    success: true,
    db: mongoose.connection.readyState === 1,
  });
});

// ── DB ──
console.log('MONGO_URI =', process.env.MONGO_URI);
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('MongoDB connected');
    console.log(
      '✅ DB Name:',
      mongoose.connection.name,
      '| Host:',
      mongoose.connection.host,
    );

    const PORT = process.env.PORT || 5000;

    app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
    });

    const DailyAvailability = require('./models/DailyAvailability');
    const { expireStaleForDaily } = require('./services/slotService');
    const { runBookingLifecycle } = require('./services/lifecycleJob');
    setInterval(async () => {
      try {
        const dailies = await DailyAvailability.find({
          'slots.lockUntil': { $lte: new Date() },
        }).limit(40);
        for (const d of dailies) {
          await expireStaleForDaily(d);
        }
        await runBookingLifecycle();
      } catch (e) {
        console.error('booking jobs:', e.message);
      }
    }, 60 * 1000);
  })
  .catch((err) => {
    console.log('Mongo error:', err);
  });
