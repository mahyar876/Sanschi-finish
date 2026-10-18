const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  reservation: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Reservation',
    required: true,
    unique: true,
  },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  pitch: { type: mongoose.Schema.Types.ObjectId, ref: 'Pitch', required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  text: { type: String, default: '', maxlength: 2000 },
  categoryRatings: {
    cleanliness: { type: Number, min: 1, max: 5 },
    flooring: { type: Number, min: 1, max: 5 },
    equipment: { type: Number, min: 1, max: 5 },
    staff: { type: Number, min: 1, max: 5 },
    lighting: { type: Number, min: 1, max: 5 },
    access: { type: Number, min: 1, max: 5 },
  },
  ownerReply: {
    text: { type: String, default: '', maxlength: 2000 },
    createdAt: { type: Date },
  },
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('Review', reviewSchema);
