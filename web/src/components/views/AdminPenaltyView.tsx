'use client';

import { useEffect, useState } from 'react';
import { ActionsPanel, PageIntro } from '@/components/dashboard/DashboardPageBlocks';
import {
  DEFAULT_PENALTY_CONFIG,
  loadPenaltyConfig,
  savePenaltyConfig,
  type PenaltyConfig,
  type PenaltyDifficultyKey,
} from '@/lib/penalty-config';
import { numFa } from '@/lib/jalali';

const LABELS: Record<PenaltyDifficultyKey, string> = {
  easy: 'آسان (هدف ~۲۰٪ پنج‌از‌پنج)',
  medium: 'متوسط (هدف ~۱۰٪)',
  hard: 'سخت (هدف ~۵٪)',
};

export function AdminPenaltyView() {
  const [config, setConfig] = useState<PenaltyConfig>(DEFAULT_PENALTY_CONFIG);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    setConfig(loadPenaltyConfig());
  }, []);

  function updateLevel(level: PenaltyDifficultyKey, field: keyof PenaltyConfig['easy'], value: number) {
    setConfig((c) => ({
      ...c,
      [level]: { ...c[level], [field]: value },
    }));
  }

  function submit() {
    savePenaltyConfig(config);
    setMsg('تنظیمات ذخیره شد. بازیکنان در بازی پنالتی (همان مرورگر) این مقادیر را می‌بینند.');
    setTimeout(() => setMsg(''), 4000);
  }

  function resetDefaults() {
    setConfig(DEFAULT_PENALTY_CONFIG);
    savePenaltyConfig(DEFAULT_PENALTY_CONFIG);
    setMsg('به پیش‌فرض برگشت.');
  }

  return (
    <>
      <PageIntro
        title="تنظیمات بازی پنالتی"
        description="درصد و سقف مبلغ تخفیف برای هر سطح سختی"
      />
      <p className="notice" style={{ marginBottom: '1.25rem' }}>
        تخفیف رزرو: <strong>درصد</strong> از مبلغ سفارش + <strong>سقف مبلغ ثابت</strong> (هر کدام
        محدودکننده‌تر اعمال می‌شود). احتمال پنج گل از پنج شوت در کد بازی: آسان ~۲۰٪، متوسط ~۱۰٪،
        سخت ~۵٪.
      </p>

      {(Object.keys(LABELS) as PenaltyDifficultyKey[]).map((level) => (
        <ActionsPanel key={level} title={LABELS[level]}>
          <div className="penalty-level-grid">
            <div className="field">
              <label>درصد تخفیف</label>
              <input
                type="number"
                min={0}
                max={100}
                value={config[level].discountPercent}
                onChange={(e) =>
                  updateLevel(level, 'discountPercent', parseInt(e.target.value, 10) || 0)
                }
              />
            </div>
            <div className="field">
              <label>سقف مبلغ تخفیف (تومان)</label>
              <input
                type="number"
                min={0}
                step={10000}
                value={config[level].discountFixedCap}
                onChange={(e) =>
                  updateLevel(level, 'discountFixedCap', parseInt(e.target.value, 10) || 0)
                }
              />
            </div>
            <div className="field">
              <label>حداقل گل برای کد</label>
              <input
                type="number"
                min={1}
                max={5}
                value={config[level].minGoals}
                onChange={(e) =>
                  updateLevel(level, 'minGoals', parseInt(e.target.value, 10) || 5)
                }
              />
            </div>
          </div>
          <p className="muted-sm" style={{ margin: 0 }}>
            نمونه: {numFa(config[level].discountPercent)}٪ تخفیف تا سقف{' '}
            {numFa(config[level].discountFixedCap.toLocaleString('en-US'))} تومان — با{' '}
            {numFa(config[level].minGoals)} گل از ۵
          </p>
        </ActionsPanel>
      ))}

      <div className="hero-actions">
        <button type="button" className="btn btn-primary" onClick={submit}>
          ذخیره تنظیمات
        </button>
        <button type="button" className="btn btn-secondary" onClick={resetDefaults}>
          پیش‌فرض
        </button>
      </div>
      {msg && <p className="form-msg ok" style={{ marginTop: '1rem' }}>{msg}</p>}
    </>
  );
}
