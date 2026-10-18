const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  category: {
    type: String,
    enum: ['general', 'booking', 'payment', 'dispute'],
    default: 'general',
  },
  subject: { type: String, required: true, trim: true, maxlength: 120 },
  message: { type: String, required: true, trim: true, maxlength: 4000 },
  status: {
    type: String,
    enum: ['open', 'in_progress', 'closed'],
    default: 'open',
    index: true,
  },
  adminReply: { type: String, default: '', maxlength: 4000 },
  repliedAt: { type: Date, default: null },
  repliedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  reservationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    default: null,
  },
  createdAt: { type: Date, default: Date.now },
});

supportTicketSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
