/** فیلدهای مجاز برای ایجاد/ویرایش زمین توسط ادمین — جلوگیری از mass assignment */
const PITCH_ADMIN_WRITABLE = [
  'name',
  'type',
  'size',
  'price',
  'address',
  'desc',
  'rulesText',
  'amenities',
  'maxCapacity',
  'tags',
  'color1',
  'color2',
  'image',
  'isActive',
  'slots',
  'commissionAmount',
  'lat',
  'lng',
  'lastMinuteEnabled',
  'lastMinuteDiscount60',
  'lastMinuteDiscount30',
  'lastMinuteMaxPct',
  'owner',
  'womenBookingAllowed',
  'sortOrder',
];

function pickPitchFields(body) {
  const out = {};
  if (!body || typeof body !== 'object') return out;
  for (const key of PITCH_ADMIN_WRITABLE) {
    if (Object.prototype.hasOwnProperty.call(body, key)) {
      out[key] = body[key];
    }
  }
  return out;
}

module.exports = { PITCH_ADMIN_WRITABLE, pickPitchFields };
