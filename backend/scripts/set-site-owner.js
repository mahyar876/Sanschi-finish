// node scripts/set-site-owner.js
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const User = require('../models/User');

const SITE_OWNER_PHONE = '09337752754';
const OTHER_PHONE = '09057752714';
const ADMIN_EMAIL = 'admin@sanschii.ir';

async function run() {
  await mongoose.connect(process.env.MONGO_URI);

  await User.updateOne({ phone: OTHER_PHONE }, { $unset: { email: '' }, role: 'user' });

  const owner = await User.findOne({ phone: SITE_OWNER_PHONE });
  if (!owner) {
    console.error('❌ حساب با شماره', SITE_OWNER_PHONE, 'پیدا نشد. اول ثبت‌نام کنید.');
    process.exit(1);
  }
  owner.role = 'admin';
  owner.email = ADMIN_EMAIL;
  await owner.save();

  const rows = await User.find({ phone: { $in: [SITE_OWNER_PHONE, OTHER_PHONE] } }).select(
    'name phone email role',
  );
  console.log('✅ مالک سایت:', SITE_OWNER_PHONE);
  console.log(JSON.stringify(rows, null, 2));

  await mongoose.disconnect();
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
