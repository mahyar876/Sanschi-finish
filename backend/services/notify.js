const Notification = require('../models/Notification');
const Pitch = require('../models/Pitch');

async function createNotification(userId, payload) {
  try {
    await Notification.create({
      user: userId,
      title: payload.title,
      body: payload.body,
      type: payload.type || 'info',
      reservation: payload.reservationId || null,
      read: false,
    });
  } catch (e) {
    console.error('createNotification:', e.message);
  }
}

const { sendSms: sendSmsProvider } = require('./sms');

async function sendSms(phone, text) {
  await sendSmsProvider(phone, text);
}

async function notifyBookingConfirmed(reservation) {
  const pitch = await Pitch.findById(reservation.pitch).select('name owner');
  const userMsg = `رزرو شما در ${pitch?.name || 'مجموعه'} تأیید شد. کد: ${reservation.code} · ${reservation.date} ${reservation.slotTime}`;
  await createNotification(reservation.user, {
    title: 'تأیید رزرو',
    body: userMsg,
    type: 'booking_confirmed',
    reservationId: reservation._id,
  });

  const user = await require('../models/User').findById(reservation.user).select(
    'phone name',
  );
  if (user?.phone) await sendSms(user.phone, userMsg);

  if (pitch?.owner) {
    await createNotification(pitch.owner, {
      title: 'رزرو جدید',
      body: `رزرو جدید ${reservation.code} · ${reservation.date} ${reservation.slotTime}`,
      type: 'owner_new_booking',
      reservationId: reservation._id,
    });
    const owner = await require('../models/User')
      .findById(pitch.owner)
      .select('phone');
    if (owner?.phone) {
      await sendSms(owner.phone, `رزرو جدید در ${pitch.name}: ${reservation.code}`);
    }
  }
}

async function notifyCancelled(reservation, by) {
  const title = by === 'owner' ? 'لغو رزرو توسط مجموعه' : 'لغو رزرو';
  await createNotification(reservation.user, {
    title,
    body: `رزرو ${reservation.code} لغو شد.${reservation.cancelReason ? ' دلیل: ' + reservation.cancelReason : ''}`,
    type: 'booking_cancelled',
    reservationId: reservation._id,
  });
}

module.exports = {
  createNotification,
  sendSms,
  notifyBookingConfirmed,
  notifyCancelled,
};
