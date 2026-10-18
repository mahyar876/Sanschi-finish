import { normalizeAmenityIds, type PitchAmenityId } from '@/lib/pitch-amenities';
import { buildDefaultPitchRules } from '@/lib/pitch-default-rules';

const TAG_AMENITY: [RegExp, PitchAmenityId][] = [
  [/پارکینگ/i, 'parking'],
  [/بوفه|کافه|نوشیدنی/i, 'buffet'],
  [/رختکن/i, 'locker_room'],
  [/دوش/i, 'shower'],
  [/تلمبه|پمپ/i, 'pump'],
  [/توپ/i, 'ball_rental'],
  [/تریبون|تماشا/i, 'spectators'],
  [/تهویه/i, 'ventilation'],
  [/سرمای/i, 'cooling'],
  [/گرمای/i, 'heating'],
  [/مربی|کلاس/i, 'coach'],
];

const EXTRA_POOL: PitchAmenityId[] = [
  'parking',
  'buffet',
  'shower',
  'locker',
  'spectators',
  'ball_rental',
  'pump',
  'cooling',
  'heating',
  'coach',
  'ventilation',
  'water_cooler',
];

function hashKey(str: string): number {
  let h = 0;
  for (let i = 0; i < str.length; i += 1) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h);
}

function amenitiesFromTags(tags: string[]): Set<PitchAmenityId> {
  const out = new Set<PitchAmenityId>();
  for (const t of tags) {
    for (const [re, id] of TAG_AMENITY) {
      if (re.test(t)) out.add(id);
    }
  }
  return out;
}

function baseAmenities(type: 'grass' | 'futsal'): PitchAmenityId[] {
  if (type === 'grass') {
    return ['restroom', 'green_space', 'ball_rental', 'pump', 'spectators'];
  }
  return ['restroom', 'locker_room', 'ventilation', 'water_cooler', 'locker'];
}

export function maxCapacityForPitchSize(size: 5 | 7 | 11): number {
  if (size === 11) return 22;
  if (size === 7) return 14;
  return 10;
}

function womenBookingFromHash(h: number): boolean | null {
  if (h % 5 === 0) return true;
  if (h % 7 === 0) return false;
  return null;
}

export type PitchCatalogEnrichmentInput = {
  name: string;
  address?: string;
  type: 'grass' | 'futsal';
  size: 5 | 7 | 11;
  tags?: string[];
  amenities?: string[];
  maxCapacity?: number | null;
  womenBookingAllowed?: boolean | null;
  rulesText?: string;
};

export function enrichPitchCatalogFields(input: PitchCatalogEnrichmentInput): {
  amenities: PitchAmenityId[];
  maxCapacity: number;
  womenBookingAllowed: boolean | null;
  rulesText: string;
} {
  const key = `${input.name}|${input.address || ''}`;
  const h = hashKey(key);
  const set = new Set(baseAmenities(input.type));
  for (const id of amenitiesFromTags(input.tags || [])) set.add(id);
  for (let i = 0; i < EXTRA_POOL.length; i += 1) {
    if ((h >> (i % 12)) & 1) set.add(EXTRA_POOL[i]);
  }
  if (set.size < 4) {
    for (const id of EXTRA_POOL) {
      set.add(id);
      if (set.size >= 5) break;
    }
  }

  const normalizedExisting = normalizeAmenityIds(input.amenities);
  const amenities = normalizedExisting.length ? normalizedExisting : [...set];

  const rulesTrim = input.rulesText?.trim() ?? '';
  const rulesText =
    rulesTrim || buildDefaultPitchRules(input.type, input.size);

  return {
    amenities,
    maxCapacity: input.maxCapacity ?? maxCapacityForPitchSize(input.size),
    womenBookingAllowed:
      input.womenBookingAllowed !== undefined && input.womenBookingAllowed !== null
        ? input.womenBookingAllowed
        : womenBookingFromHash(h),
    rulesText,
  };
}
