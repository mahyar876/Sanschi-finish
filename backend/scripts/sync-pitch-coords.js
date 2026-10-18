/** یک‌بار: پر کردن lat/lng زمین‌های بدون مختصات از کاتالوگ نام */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Pitch = require('../models/Pitch');
const { matchPitchNameToCoords } = require('../lib/pitchVenueMatch');
const { isValidCoordPair } = require('../lib/pitchCoords');

async function main() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/sanschii';
  await mongoose.connect(uri);
  const rows = await Pitch.find({}, 'name lat lng').lean();
  let updated = 0;
  for (const row of rows) {
    if (isValidCoordPair(row.lat, row.lng)) continue;
    const c = matchPitchNameToCoords(row.name);
    if (!c) continue;
    await Pitch.updateOne({ _id: row._id }, { $set: { lat: c.lat, lng: c.lng } });
    updated += 1;
    console.log('✓', row.name, c.lat, c.lng);
  }
  console.log(`Done. Updated ${updated} / ${rows.length} pitches.`);
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
