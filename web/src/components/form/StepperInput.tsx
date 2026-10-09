'use client';

import { numFa } from '@/lib/jalali';

type Props = {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  label?: string;
  suffix?: string;
};

export function StepperInput({
  value,
  onChange,
  min = 1,
  max = 99,
  label,
  suffix,
}: Props) {
  function step(delta: number) {
    const next = Math.min(max, Math.max(min, value + delta));
    onChange(next);
  }

  return (
    <div className="stepper-field">
      {label ? <span className="stepper-label">{label}</span> : null}
      <div className="stepper">
        <button type="button" className="stepper-btn" onClick={() => step(-1)} disabled={value <= min} aria-label="کاهش">
          −
        </button>
        <span className="stepper-value">
          {numFa(value)}
          {suffix ? ` ${suffix}` : ''}
        </span>
        <button type="button" className="stepper-btn" onClick={() => step(1)} disabled={value >= max} aria-label="افزایش">
          +
        </button>
      </div>
    </div>
  );
}
