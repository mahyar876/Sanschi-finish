const Reservation = require('../models/Reservation');
const { slotTimeRange } = require('../lib/jalaliTime');
const { BOOKING_STATUS } = require('../lib/bookingConstants');
const { appendHistory } = require('./bookingHistory');

const NO_SHOW_GRACE_MS = parseInt(process.env.NO_SHOW_GRACE_MIN || '45', 10) * 60 * 1000;

async function runBookingLifecycle() {
  const now = new Date();
  const open = await Reservation.find({
    bookingStatus: {
      $in: [BOOKING_STATUS.CONFIRMED, BOOKING_STATUS.CHECKED_IN],
    },
  }).limit(200);

  for (const r of open) {
    try {
      const { start, end } = slotTimeRange(r.date, r.slotTime, now);
      if (r.bookingStatus === BOOKING_STATUS.CHECKED_IN && now >= end) {
        r.bookingStatus = BOOKING_STATUS.COMPLETED;
        r.completedAt = now;
        await r.save();
        await appendHistory(r._id, 'completed', 'سانس به پایان رسید');
        continue;
      }
      if (
        r.bookingStatus === BOOKING_STATUS.CONFIRMED &&
        now.getTime() > start.getTime() + NO_SHOW_GRACE_MS
      ) {
        r.bookingStatus = BOOKING_STATUS.NO_SHOW;
        r.completedAt = now;
        await r.save();
        await appendHistory(r._id, 'no_show', 'عدم مراجعه ثبت شد');
      }
    } catch (e) {
      console.error('lifecycle reservation', r._id, e.message);
    }
  }
}

module.exports = { runBookingLifecycle };
