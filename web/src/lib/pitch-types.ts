export type PitchSlot = {
  time: string;
  price: number;
  taken?: boolean;
};

export type Pitch = {
  _id: string;
  name: string;
  type: 'futsal' | 'grass';
  size: 5 | 7 | 11;
  price: number;
  address: string;
  desc?: string;
  tags: string[];
  image?: string;
  isActive: boolean;
  commissionAmount: number;
  slots: PitchSlot[];
  lat?: number;
  lng?: number;
  sortOrder?: number;
  lastMinuteEnabled?: boolean;
  /** درصد تخفیف وقتی ≤۱ ساعت تا شروع مانده (null = پیش‌فرض پلتفرم) */
  lastMinuteDiscount60?: number | null;
  /** درصد تخفیف وقتی ≤۳۰ دقیقه مانده */
  lastMinuteDiscount30?: number | null;
  lastMinuteMaxPct?: number | null;
  owner?: { _id: string; name?: string; phone?: string } | null;
};

export const DEFAULT_SLOT_TIMES = [
  '۰۶:۰۰–۰۷:۳۰',
  '۰۷:۳۰–۰۹:۰۰',
  '۰۹:۰۰–۱۰:۳۰',
  '۱۰:۳۰–۱۲:۰۰',
  '۱۲:۰۰–۱۳:۳۰',
  '۱۳:۳۰–۱۵:۰۰',
  '۱۵:۰۰–۱۶:۳۰',
  '۱۶:۳۰–۱۸:۰۰',
  '۱۸:۰۰–۱۹:۳۰',
  '۱۹:۳۰–۲۱:۰۰',
  '۲۱:۰۰–۲۲:۳۰',
];

export function defaultSlots(basePrice = 550_000): PitchSlot[] {
  return DEFAULT_SLOT_TIMES.map((time, i) => ({
    time,
    price: i >= 7 ? 700_000 : basePrice,
    taken: false,
  }));
}
