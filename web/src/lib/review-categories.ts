/** امتیاز جزئی نظر — مشابه پلتفرم‌های رزرو ورزشی */
export const REVIEW_CATEGORIES = [
  { key: 'cleanliness', label: 'نظافت و بهداشت' },
  { key: 'flooring', label: 'کیفیت کف‌پوش و زمین' },
  { key: 'equipment', label: 'تجهیزات جانبی' },
  { key: 'staff', label: 'برخورد پرسنل و مربیان' },
  { key: 'lighting', label: 'کیفیت روشنایی و تهویه' },
  { key: 'access', label: 'دسترسی و پارکینگ' },
] as const;

export type ReviewCategoryKey = (typeof REVIEW_CATEGORIES)[number]['key'];

export type ReviewCategoryRatings = Partial<Record<ReviewCategoryKey, number>>;

export function averageCategoryRatings(
  reviews: { categoryRatings?: ReviewCategoryRatings | null }[],
): ReviewCategoryRatings {
  const sums: Record<string, { total: number; n: number }> = {};
  for (const r of reviews) {
    const cr = r.categoryRatings;
    if (!cr) continue;
    for (const { key } of REVIEW_CATEGORIES) {
      const v = cr[key];
      if (typeof v !== 'number' || v < 1 || v > 5) continue;
      if (!sums[key]) sums[key] = { total: 0, n: 0 };
      sums[key].total += v;
      sums[key].n += 1;
    }
  }
  const out: ReviewCategoryRatings = {};
  for (const { key } of REVIEW_CATEGORIES) {
    const s = sums[key];
    if (s && s.n > 0) out[key] = Math.round((s.total / s.n) * 10) / 10;
  }
  return out;
}
