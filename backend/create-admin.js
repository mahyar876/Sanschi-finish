// create-admin.js — بذار داخل پوشه backend
// اجرا: node create-admin.js

const mongoose = require('mongoose');
const dotenv = require('dotenv');
dotenv.config();

// مدل User رو مستقیم اینجا تعریف میکنیم
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  email: {
    type: String,
    unique: true,
    sparse: true,
    lowercase: true,
    default: null,
  },
  password: { type: String, select: false },
  role: { type: String, default: 'user' },
  createdAt: { type: Date, default: Date.now },
});

userSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

const User = mongoose.models.User || mongoose.model('User', userSchema);

// ── اطلاعات ادمین — اینجا عوض کن ──
const ADMIN_EMAIL = 'admin@sanschii.ir';
const ADMIN_PASS = 'Admin@1234';
const ADMIN_PHONE = '09337752754';
const ADMIN_NAME = 'مدیر سیستم';

async function run() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✅ متصل به MongoDB:', mongoose.connection.name);

    let user = await User.findOne({ phone: ADMIN_PHONE });

    if (user) {
      user.name = user.name || ADMIN_NAME;
      user.role = 'admin';
      if (ADMIN_PASS) user.password = ADMIN_PASS;
      if (ADMIN_EMAIL && !user.email) {
        const emailTaken = await User.findOne({ email: ADMIN_EMAIL, _id: { $ne: user._id } });
        if (!emailTaken) user.email = ADMIN_EMAIL;
      }
      await user.save();
      console.log('✅ مالک سایت (ادمین) با همین شماره به‌روز شد');
    } else {
      user = new User({
        name: ADMIN_NAME,
        phone: ADMIN_PHONE,
        email: ADMIN_EMAIL,
        password: ADMIN_PASS,
        role: 'admin',
      });
      await user.save();
      console.log('✅ ادمین جدید ساخته شد');
    }

    console.log('');
    console.log('══════════════════════════════');
    console.log('  اطلاعات ورود به پنل ادمین  ');
    console.log('══════════════════════════════');
    console.log('  📧 ایمیل :', ADMIN_EMAIL);
    console.log('  🔑 رمز   :', ADMIN_PASS);
    console.log('══════════════════════════════');
    console.log('');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('❌ خطا:', err.message);
    process.exit(1);
  }
}

run();
