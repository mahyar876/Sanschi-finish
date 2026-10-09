export type PenaltyDifficultyKey = 'easy' | 'medium' | 'hard';

export type PenaltyDifficultyReward = {
  /** درصد تخفیف (مثلاً ۵) */
  discountPercent: number;
  /** سقف مبلغ تخفیف به تومان */
  discountFixedCap: number;
  /** حداقل گل برای دریافت کد */
  minGoals: number;
};

export type PenaltyConfig = {
  easy: PenaltyDifficultyReward;
  medium: PenaltyDifficultyReward;
  hard: PenaltyDifficultyReward;
  updatedAt?: string;
};

export const PENALTY_CONFIG_STORAGE_KEY = 'sanschi_penalty_config';

export const DEFAULT_PENALTY_CONFIG: PenaltyConfig = {
  easy: { discountPercent: 5, discountFixedCap: 700_000, minGoals: 5 },
  medium: { discountPercent: 5, discountFixedCap: 1_000_000, minGoals: 5 },
  hard: { discountPercent: 5, discountFixedCap: 1_500_000, minGoals: 5 },
};

export function loadPenaltyConfig(): PenaltyConfig {
  if (typeof window === 'undefined') return DEFAULT_PENALTY_CONFIG;
  try {
    const raw = localStorage.getItem(PENALTY_CONFIG_STORAGE_KEY);
    if (!raw) return DEFAULT_PENALTY_CONFIG;
    const parsed = JSON.parse(raw) as PenaltyConfig;
    return { ...DEFAULT_PENALTY_CONFIG, ...parsed, easy: { ...DEFAULT_PENALTY_CONFIG.easy, ...parsed.easy }, medium: { ...DEFAULT_PENALTY_CONFIG.medium, ...parsed.medium }, hard: { ...DEFAULT_PENALTY_CONFIG.hard, ...parsed.hard } };
  } catch {
    return DEFAULT_PENALTY_CONFIG;
  }
}

export function savePenaltyConfig(config: PenaltyConfig) {
  const payload: PenaltyConfig = {
    ...config,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(PENALTY_CONFIG_STORAGE_KEY, JSON.stringify(payload));
  return payload;
}
