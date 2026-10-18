/** امکانات مرتبط با چمن، فوتسال و سالن — فیلتر گالری و پنل مالک */
export const PITCH_AMENITIES = [
  { id: 'parking', label: 'پارکینگ' },
  { id: 'buffet', label: 'بوفه / کافه' },
  { id: 'restroom', label: 'سرویس بهداشتی' },
  { id: 'locker_room', label: 'رختکن' },
  { id: 'shower', label: 'دوش' },
  { id: 'locker', label: 'کمد' },
  { id: 'spectators', label: 'جایگاه تماشاچیان' },
  { id: 'ball_rental', label: 'اجاره توپ' },
  { id: 'pump', label: 'تلمبه' },
  { id: 'water_cooler', label: 'آبسردکن' },
  { id: 'ventilation', label: 'تهویه هوا' },
  { id: 'cooling', label: 'سرمایش' },
  { id: 'heating', label: 'گرمایش' },
  { id: 'green_space', label: 'فضای سبز (چمن / محوطه)' },
  { id: 'coach', label: 'مربی / کلاس' },
] as const;

export type PitchAmenityId = (typeof PITCH_AMENITIES)[number]['id'];

const labelById = new Map(PITCH_AMENITIES.map((a) => [a.id, a.label]));

export function amenityLabel(id: string): string {
  return labelById.get(id as PitchAmenityId) ?? id;
}

export function normalizeAmenityIds(raw: unknown): PitchAmenityId[] {
  if (!Array.isArray(raw)) return [];
  const allowed = new Set(PITCH_AMENITIES.map((a) => a.id));
  return raw.filter((x): x is PitchAmenityId => typeof x === 'string' && allowed.has(x as PitchAmenityId));
}
