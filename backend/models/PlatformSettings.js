const mongoose = require('mongoose');

const PlatformSettingsSchema = new mongoose.Schema(
  {
    /** کلید ثابت — یک سند برای کل پلتفرم */
    key: { type: String, unique: true, default: 'site', required: true },
    /** تعداد کارت مجموعه در صفحهٔ اصلی (بخش «مجموعه‌های دیگر») */
    homeVenuePreviewCount: { type: Number, default: 4, min: 1, max: 12 },
    /**
     * جایگاه ثابت صفحهٔ اصلی (قرارداد / تبلیغ — مثلاً یک ماه)
     * pitchId, expiresAt, note, sortOrder
     */
    homeFeaturedPlacements: {
      type: [
        {
          pitchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Pitch', required: true },
          expiresAt: { type: Date, required: true },
          note: { type: String, default: '' },
          sortOrder: { type: Number, default: 0 },
        },
      ],
      default: [],
    },
  },
  { timestamps: true },
);

module.exports = mongoose.model('PlatformSettings', PlatformSettingsSchema);
