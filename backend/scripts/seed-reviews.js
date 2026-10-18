/**
 * نظرات نمایشی برای هر زمین — reservation + user ساختگی (فقط dev/demo).
 * اجرا: npm run seed:reviews
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const bcrypt = require('bcryptjs');
const Pitch = require('../models/Pitch');
const User = require('../models/User');
const Reservation = require('../models/Reservation');
const Review = require('../models/Review');

const REVIEW_TEXTS = [
  'کف سالن عالی بود، سانس دقیق شروع شد. دفعه بعد هم همینجا رزرو می‌کنم.',
  'پارکینگ کمی شلوغ بود ولی داخل مجموعه تمیز و نور خوبی داشت.',
  'برخورد پرسنل محترمانه بود. دوش و رختکن مرتب.',
  'برای بازی دوستانه فوق‌العاده بود؛ فقط تهویه یک‌کم ضعیف‌تر از انتظار.',
  'قیمت نسبت به کیفیت چمن منطقی بود. توصیه می‌کنم.',
  'سانس شب خیلی خوب بود، روشنایی زمین استاندارد.',
  'یک بار تاخیر کوتاه داشتند ولی جبران کردند — راضی‌ام.',
  'امکانات جانبی مثل آبسردکن و بوفه به درد بازی خورد.',
];

const NAMES = [
  'امیررضا',
  'سارا',
  'مهدی',
  'نازنین',
  'پارسا',
  'الهام',
  'کاوه',
  'مریم',
  'بهرام',
  'شیما',
];

function pick(arr, i) {
  return arr[i % arr.length];
}

function categoryRatings(seed) {
  const base = 3 + (seed % 3);
  return {
    cleanliness: Math.min(5, base + (seed % 2)),
    flooring: Math.min(5, base),
    equipment: Math.min(5, base - (seed % 2)),
    staff: Math.min(5, base + 1),
    lighting: Math.min(5, base),
    access: Math.min(5, base - (seed % 3)),
  };
}

async function ensureSeedUser(phone, name) {
  let user = await User.findOne({ phone });
  if (user) return user;
  const password = await bcrypt.hash('SeedReview1!', 10);
  user = await User.create({
    name,
    phone,
    password,
    role: 'user',
  });
  return user;
}

async function seedReviews() {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI در .env تنظیم نشده.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ متصل به MongoDB');

  const pitches = await Pitch.find({ isActive: { $ne: false } }).select('name slots price').lean();
  if (!pitches.length) {
    console.log('⚠️  زمینی در DB نیست — اول npm run seed');
    await mongoose.disconnect();
    process.exit(0);
  }

  const users = [];
  for (let i = 0; i < NAMES.length; i += 1) {
    const phone = `0998${String(1000000 + i).slice(-7)}`;
    users.push(await ensureSeedUser(phone, NAMES[i]));
  }

  let created = 0;
  let skipped = 0;

  for (const pitch of pitches) {
    const reviewsPerPitch = 3;
    for (let r = 0; r < reviewsPerPitch; r += 1) {
      const user = users[(created + r) % users.length];
      const slot = pitch.slots?.[2] || pitch.slots?.[0];
      const slotTime = slot?.time || '۱۸:۰۰–۱۹:۳۰';
      const amount = slot?.price || pitch.price || 550000;
      const marker = `seed-review-${pitch._id}-${r}`;

      const existingRes = await Reservation.findOne({ note: marker }).lean();
      if (existingRes) {
        const hasReview = await Review.findOne({ reservation: existingRes._id }).lean();
        if (hasReview) {
          skipped += 1;
          continue;
        }
      }

      let reservation = existingRes;
      if (!reservation) {
        reservation = await Reservation.create({
          user: user._id,
          pitch: pitch._id,
          slotIndex: 2,
          slotTime,
          date: '1403/10/01',
          playerCount: 10,
          note: marker,
          amount,
          status: 'paid',
          bookingStatus: 'completed',
          paymentStatus: 'successful',
          completedAt: new Date(Date.now() - (created + r + 1) * 86400000),
        });
      }

      const rating = 4 + ((created + r) % 2);
      await Review.create({
        reservation: reservation._id,
        user: user._id,
        pitch: pitch._id,
        rating,
        text: pick(REVIEW_TEXTS, created + r),
        categoryRatings: categoryRatings(created + r + pitch.name.length),
        createdAt: new Date(Date.now() - (created + r + 2) * 3600000),
      });
      created += 1;
    }
  }

  console.log(`✅ ${created} نظر جدید ثبت شد`);
  console.log(`↷ ${skipped} از قبل بود`);
  await mongoose.disconnect();
  console.log('🎉 تموم شد!');
  process.exit(0);
}

seedReviews().catch((err) => {
  console.error('❌', err.message);
  process.exit(1);
});
