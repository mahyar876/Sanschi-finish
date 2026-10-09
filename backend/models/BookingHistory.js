const mongoose = require('mongoose');

const bookingHistorySchema = new mongoose.Schema({
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    required: true,
    index: true,
  },
  at: { type: Date, default: Date.now },
  action: { type: String, required: true },
  detail: { type: String, default: '' },
  meta: { type: mongoose.Schema.Types.Mixed, default: null },
});

module.exports = mongoose.model('BookingHistory', bookingHistorySchema);
