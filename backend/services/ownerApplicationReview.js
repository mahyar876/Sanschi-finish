const Pitch = require('../models/Pitch');
const User = require('../models/User');
const OwnerApplication = require('../models/OwnerApplication');
const { createNotification } = require('./notify');

async function notifyApplicantByPhone(phone, { title, body, type }) {
  const user = await User.findOne({ phone });
  if (!user) return;
  await createNotification(user._id, { title, body, type });
}

/**
 * تأیید درخواست: ایجاد زمین + اتصال مالک در صورت وجود حساب
 */
async function approveOwnerApplication(applicationId, { adminNote = '' } = {}) {
  const app = await OwnerApplication.findById(applicationId);
  if (!app) {
    const err = new Error('درخواست پیدا نشد');
    err.statusCode = 404;
    throw err;
  }
  if (app.status !== 'pending') {
    const err = new Error('این درخواست قبلاً بررسی شده است');
    err.statusCode = 400;
    throw err;
  }

  const pitch = await Pitch.create({
    name: app.venueName,
    type: app.venueType,
    size: app.size,
    price: app.basePrice,
    address: app.address,
    desc: app.description || '',
    tags: [],
    isActive: false,
    owner: null,
  });

  const user = await User.findOne({ phone: app.phone });
  let status = 'approved_awaiting_signup';
  let message =
    'زمین ثبت شد. مالک هنوز در سایت ثبت‌نام نکرده — پس از ثبت‌نام، مالکیت را وصل کنید.';

  if (user) {
    if (user.role !== 'admin') {
      user.role = 'owner';
      await user.save();
    }
    pitch.owner = user._id;
    pitch.isActive = true;
    await pitch.save();
    status = 'approved';
    message = `زمین «${pitch.name}» تأیید شد و به ${user.name} متصل شد.`;
  }

  app.status = status;
  app.pitch = pitch._id;
  app.adminNote = adminNote;
  app.reviewedAt = new Date();
  await app.save();

  await notifyApplicantByPhone(app.phone, {
    title: 'تأیید درخواست همکاری',
    body: message,
    type: 'partner_approved',
  });

  return { application: app, pitch, user, message };
}

async function rejectOwnerApplication(applicationId, { rejectReason = '' } = {}) {
  const app = await OwnerApplication.findById(applicationId);
  if (!app) {
    const err = new Error('درخواست پیدا نشد');
    err.statusCode = 404;
    throw err;
  }
  if (app.status !== 'pending') {
    const err = new Error('این درخواست قبلاً بررسی شده است');
    err.statusCode = 400;
    throw err;
  }
  app.status = 'rejected';
  app.rejectReason = rejectReason;
  app.reviewedAt = new Date();
  await app.save();

  await notifyApplicantByPhone(app.phone, {
    title: 'رد درخواست همکاری',
    body: rejectReason
      ? `درخواست «${app.venueName}» رد شد. ${rejectReason}`
      : `درخواست «${app.venueName}» رد شد.`,
    type: 'partner_rejected',
  });

  return app;
}

async function requestOwnerApplicationRevision(
  applicationId,
  { revisionNote = '' } = {},
) {
  const app = await OwnerApplication.findById(applicationId);
  if (!app) {
    const err = new Error('درخواست پیدا نشد');
    err.statusCode = 404;
    throw err;
  }
  if (app.status !== 'pending') {
    const err = new Error('فقط درخواست‌های در انتظار را می‌توان برای اصلاح فرستاد');
    err.statusCode = 400;
    throw err;
  }
  const note = String(revisionNote || '').trim();
  if (note.length < 10) {
    const err = new Error('توضیح اصلاحات را حداقل در ۱۰ کاراکتر بنویسید');
    err.statusCode = 400;
    throw err;
  }
  app.status = 'needs_revision';
  app.revisionNote = note;
  app.reviewedAt = new Date();
  await app.save();

  await notifyApplicantByPhone(app.phone, {
    title: 'نیاز به اصلاح درخواست همکاری',
    body: `برای «${app.venueName}»: ${note}`,
    type: 'partner_needs_revision',
  });

  return app;
}

/** بعد از ثبت‌نام، درخواست‌های تأییدشدهٔ بدون مالک را وصل می‌کند */
async function linkApprovedApplicationsForPhone(phone) {
  const user = await User.findOne({ phone });
  if (!user) return;

  const apps = await OwnerApplication.find({
    phone,
    status: 'approved_awaiting_signup',
    pitch: { $ne: null },
  });

  if (!apps.length) return;

  if (user.role !== 'admin') {
    user.role = 'owner';
    await user.save();
  }

  for (const app of apps) {
    await Pitch.findByIdAndUpdate(app.pitch, { owner: user._id, isActive: true });
    app.status = 'approved';
    await app.save();
  }
}

module.exports = {
  approveOwnerApplication,
  rejectOwnerApplication,
  requestOwnerApplicationRevision,
  linkApprovedApplicationsForPhone,
};
