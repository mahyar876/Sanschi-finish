const BookingHistory = require('../models/BookingHistory');

async function appendHistory(reservationId, action, detail = '', meta = null) {
  try {
    await BookingHistory.create({
      reservation: reservationId,
      action,
      detail,
      meta,
    });
  } catch (err) {
    console.error('appendHistory error:', err.message);
  }
}

module.exports = { appendHistory };
