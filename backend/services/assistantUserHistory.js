const Reservation = require('../models/Reservation');

const SUCCESS_BOOKING = ['confirmed', 'completed', 'checked_in'];

/**
 * آخرین زمینی که کاربر با پرداخت موفق رزرو کرده (فعال).
 * @param {string} userId
 */
async function getLastSuccessfulPitch(userId) {
  if (!userId) return null;

  const row = await Reservation.findOne({
    user: userId,
    paymentStatus: 'successful',
    bookingStatus: { $in: SUCCESS_BOOKING },
  })
    .sort({ createdAt: -1 })
    .populate({ path: 'pitch', select: 'name type isActive' })
    .lean();

  if (!row?.pitch?._id) return null;
  if (row.pitch.isActive === false) return null;

  return {
    pitchId: String(row.pitch._id),
    pitchName: row.pitch.name,
    pitchType: row.pitch.type,
  };
}

module.exports = { getLastSuccessfulPitch };
