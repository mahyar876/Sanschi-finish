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

// ── RATE LIMIT ──
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
});
app.use('/api/', limiter);

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
  })
  .catch((err) => {
    console.log('Mongo error:', err);
  });
