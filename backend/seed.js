const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

const Pitch = require('./models/Pitch');
const defaultPitches = require('./data/defaultPitches');
const { mergeDefaultPitches } = require('./lib/mergeDefaultPitches');
const { enrichDefaultPitch } = require('./lib/enrichDefaultPitch');

async function seed() {
  try {
    if (!process.env.MONGO_URI) {
      console.error('❌ MONGO_URI در .env تنظیم نشده.');
      process.exit(1);
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ متصل به MongoDB');

    const fullReset = process.env.SEED_FULL_RESET === '1';

    if (fullReset) {
      await Pitch.deleteMany({});
      console.log('🗑️  همهٔ زمین‌ها پاک شد (SEED_FULL_RESET=1)');
      await Pitch.insertMany(defaultPitches.map(enrichDefaultPitch));
      console.log(`✅ ${defaultPitches.length} زمین از صفر seed شد`);
    } else {
      const { added, skipped, totalInDb, enriched } = await mergeDefaultPitches(Pitch, defaultPitches);
      console.log(`➕ ${added} زمین جدید اضافه شد`);
      console.log(`↷ ${skipped} مورد از قبل در دیتابیس بود (رد شد)`);
      if (enriched) console.log(`🔧 ${enriched} زمین با امکانات/فیلتر به‌روز شد`);
      console.log(`📊 مجموع در دیتابیس: ${totalInDb} زمین`);
      console.log('   (برای پاک کردن همه و seed از صفر: SEED_FULL_RESET=1 npm run seed)');
    }

    await mongoose.disconnect();
    console.log('🎉 تموم شد!');
    process.exit(0);
  } catch (err) {
    console.error('❌ خطا:', err.message);
    process.exit(1);
  }
}

seed();
