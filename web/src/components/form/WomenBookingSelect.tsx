'use client';

import {
  womenBookingFromForm,
  womenBookingToForm,
  type WomenBookingAllowed,
  type WomenBookingFormValue,
} from '@/lib/women-booking';

type Props = {
  id?: string;
  value: WomenBookingAllowed;
  onChange: (v: boolean | null) => void;
  hint?: string;
  /** ثبت زمین / همکاری — باید بله یا خیر انتخاب شود */
  requireChoice?: boolean;
};

export function WomenBookingSelect({
  id = 'women-booking',
  value,
  onChange,
  hint,
  requireChoice = false,
}: Props) {
  const formVal = womenBookingToForm(value);

  return (
    <div className="field">
      <label htmlFor={id}>رزرو برای بانوان</label>
      <select
        id={id}
        value={formVal}
        required={requireChoice}
        onChange={(e) =>
          onChange(womenBookingFromForm(e.target.value as WomenBookingFormValue))
        }
      >
        {!requireChoice ? (
          <option value="">نامشخص — بعداً مشخص می‌کنم</option>
        ) : (
          <option value="" disabled>
            انتخاب کنید…
          </option>
        )}
        <option value="yes">دارد — تیم بانوان / خانم‌ها می‌توانند رزرو کنند</option>
        <option value="no">ندارد — فقط آقایان</option>
      </select>
      {hint ? <p className="muted-sm">{hint}</p> : null}
    </div>
  );
}
