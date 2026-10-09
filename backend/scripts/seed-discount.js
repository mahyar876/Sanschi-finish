/** node scripts/seed-discount.js — نمونه کد تخفیف */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const mongoose = require('mongoose');
const DiscountCode = require('../models/DiscountCode');

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  await DiscountCode.findOneAndUpdate(
    { code: 'WELCOME10' },
    {
      code: 'WELCOME10',
      percent: 10,
      maxUses: 500,
      usedCount: 0,
      active: true,
    },
    { upsert: true, new: true },
  );
  console.log('Discount WELCOME10 ready (10%)');
  await mongoose.disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
