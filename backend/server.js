const dns = require('dns');
dns.setServers(['8.8.8.8', '1.1.1.1']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const compression = require('compression');
const helmet = require('helmet');
const dotenv = require('dotenv');
const { apiLimiter } = require('./lib/rateLimits');

dotenv.config();

const crypto = require('crypto');
const fs = require('fs');
const app = express();
const isProd = process.env.NODE_ENV === 'production';

app.use((req, res, next) => {
  const id = req.headers['x-request-id'] || crypto.randomUUID();
  req.requestId = id;
  res.setHeader('X-Request-Id', id);
  next();
});

app.set('trust proxy', 1);
app.disable('x-powered-by');

function parseCorsOrigins() {
  const raw = process.env.CORS_ORIGINS || '';
  const list = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  if (list.length) return list;
  if (!isProd) {
    return [
      'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
    ];
  }
  return [];
}

const corsOrigins = parseCorsOrigins();

// ── MIDDLEWARE ──
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }),
);
app.use(compression());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (corsOrigins.includes(origin)) return callback(null, true);
      return callback(null, false);
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '4mb' }));

app.use('/api', apiLimiter);

const path = require('path');
const legacyFront = path.join(__dirname, '../frontend/pages');
if (!isProd) {
  app.use((req, res, next) => {
    if (req.method !== 'GET' && req.method !== 'HEAD') return next();
    const legacyRoot = path.join(legacyFront, 'index.html');
    if (
      req.path === '/index.html' ||
      (req.path.endsWith('.html') &&
        fs.existsSync(path.join(legacyFront, req.path.replace(/^\//, ''))))
    ) {
      const target = process.env.FRONTEND_URL || 'http://localhost:3000';
      return res.redirect(302, target + (req.path === '/index.html' ? '/' : req.path));
    }
    next();
  });
  app.use(express.static(legacyFront));
  app.use('/assets', express.static(path.join(__dirname, '../frontend/assets')));
}

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
app.use('/api/settings', require('./routes/settings'));
app.use('/api/wallet', require('./routes/wallet'));
app.use('/api/owner-applications', require('./routes/ownerApplications'));
app.use('/api/assistant', require('./routes/assistant'));
app.use('/api/support', require('./routes/support'));
app.use('/api/favorites', require('./routes/favorites'));

// ── HEALTH ──
app.get('/api/health', (req, res) => {
  const dbOk = mongoose.connection.readyState === 1;
  res.status(dbOk ? 200 : 503).json({
    success: dbOk,
    db: dbOk,
  });
});

app.get('/api/health/live', (req, res) => {
  res.json({ success: true, live: true });
});

app.use((err, req, res, next) => {
  if (res.headersSent) return next(err);
  console.error(`Unhandled error [${req.requestId || '-'}]:`, err.message);
  res.status(500).json({ success: false, message: 'خطای سرور' });
});

process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason);
});

// ── DB ──
if (!process.env.MONGO_URI) {
  console.error('MONGO_URI is not set');
  process.exit(1);
}
mongoose
  .connect(process.env.MONGO_URI, {
    maxPoolSize: parseInt(process.env.MONGO_POOL_SIZE || '50', 10) || 50,
    serverSelectionTimeoutMS: 10_000,
  })
  .then(() => {
    console.log('MongoDB connected');
    console.log(
      '✅ DB Name:',
      mongoose.connection.name,
      '| Host:',
      mongoose.connection.host,
    );

    const PORT = process.env.PORT || 5000;

    const server = app.listen(PORT, () => {
      console.log(`Server running on ${PORT}`);
      if (isProd) {
        if (!corsOrigins.length) {
          console.warn(
            '⚠ CORS_ORIGINS خالی است — مرورگر نمی‌تواند به API از دامنهٔ فرانت وصل شود.',
          );
        }
        if (String(process.env.SMS_ENABLED || 'false') !== 'true') {
          console.warn(
            'ℹ SMS_ENABLED=false — ورود با ایمیل+رمز فعال است؛ OTP فقط در لاگ سرور (dev) یا با SMS.',
          );
        }
        const jwt = process.env.JWT_SECRET || '';
        if (jwt.length < 32) {
          console.warn('⚠ JWT_SECRET باید حداقل ۳۲ کاراکتر باشد.');
        }
      }
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.error(`Port ${PORT} in use — stop the other process or set PORT in .env`);
      } else {
        console.error('Server error:', err.message);
      }
      process.exit(1);
    });

    function shutdown(signal) {
      console.log(`${signal} — closing server…`);
      server.close(() => {
        mongoose.connection.close(false).then(() => process.exit(0));
      });
      setTimeout(() => process.exit(1), 12_000).unref();
    }
    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    const DailyAvailability = require('./models/DailyAvailability');
    const { expireStaleForDaily } = require('./services/slotService');
    const { runBookingLifecycle } = require('./services/lifecycleJob');
    let bookingJobRunning = false;
    setInterval(async () => {
      if (bookingJobRunning) return;
      bookingJobRunning = true;
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
      } finally {
        bookingJobRunning = false;
      }
    }, 60 * 1000);
  })
  .catch((err) => {
    console.log('Mongo error:', err);
  });
