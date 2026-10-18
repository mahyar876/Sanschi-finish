const { enrichDefaultPitch } = require('./enrichDefaultPitch');

function pitchKey(name, address) {
  return `${String(name || '').trim()}|${String(address || '').trim()}`;
}

/**
 * امکانات / ظرفیت / رزرو بانوان را برای زمین‌های موجود (بدون داده) از seed پر می‌کند.
 * @returns {Promise<number>}
 */
async function syncDefaultPitchEnrichment(Pitch, defaultPitches) {
  const byKey = new Map(
    defaultPitches.map((p) => [pitchKey(p.name, p.address), enrichDefaultPitch(p)]),
  );
  const rows = await Pitch.find(
    {},
    'name address amenities maxCapacity womenBookingAllowed rulesText',
  ).lean();
  let updated = 0;
  for (const row of rows) {
    const src = byKey.get(pitchKey(row.name, row.address));
    if (!src) continue;
    const patch = {};
    if (!row.amenities?.length && src.amenities?.length) {
      patch.amenities = src.amenities;
    }
    if ((row.maxCapacity == null || row.maxCapacity === undefined) && src.maxCapacity != null) {
      patch.maxCapacity = src.maxCapacity;
    }
    if (
      (row.womenBookingAllowed === null || row.womenBookingAllowed === undefined) &&
      src.womenBookingAllowed != null
    ) {
      patch.womenBookingAllowed = src.womenBookingAllowed;
    }
    if (!String(row.rulesText || '').trim() && String(src.rulesText || '').trim()) {
      patch.rulesText = src.rulesText;
    }
    if (Object.keys(patch).length) {
      await Pitch.updateOne({ _id: row._id }, { $set: patch });
      updated += 1;
    }
  }
  return updated;
}

/**
 * زمین‌های پیش‌فرض را فقط در صورت نبودن (نام + آدرس) اضافه می‌کند — موجودی DB حذف نمی‌شود.
 * @returns {{ added: number, skipped: number, totalInDb: number, enriched: number }}
 */
async function mergeDefaultPitches(Pitch, defaultPitches) {
  const enrichedDefaults = defaultPitches.map(enrichDefaultPitch);
  const existing = await Pitch.find({}, 'name address').lean();
  const keys = new Set(existing.map((p) => pitchKey(p.name, p.address)));
  const toAdd = enrichedDefaults.filter((p) => !keys.has(pitchKey(p.name, p.address)));

  if (toAdd.length) {
    await Pitch.insertMany(toAdd);
  }

  const enriched = await syncDefaultPitchEnrichment(Pitch, defaultPitches);

  return {
    added: toAdd.length,
    skipped: defaultPitches.length - toAdd.length,
    totalInDb: existing.length + toAdd.length,
    enriched,
  };
}

module.exports = { mergeDefaultPitches, syncDefaultPitchEnrichment, pitchKey };
