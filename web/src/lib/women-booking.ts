/** null = نامشخص؛ true = مجاز؛ false = فقط آقایان */
export type WomenBookingAllowed = boolean | null | undefined;

export const WOMEN_BOOKING_UNAVAILABLE_MSG =
  'متاسفانه امکان رزرو برای بانوان وجود ندارد.';

export function womenBookingUnavailable(v: WomenBookingAllowed): boolean {
  return v === false;
}

export function womenBookingLabel(v: WomenBookingAllowed): string {
  if (v === true) return 'رزرو بانوان مجاز';
  if (v === false) return 'فقط آقایان';
  return 'نامشخص';
}

export function womenBookingShort(v: WomenBookingAllowed): string | null {
  if (v === true) return 'بانوان';
  if (v === false) return 'آقایان';
  return null;
}

export type WomenBookingFormValue = '' | 'yes' | 'no';

export function womenBookingToForm(v: WomenBookingAllowed): WomenBookingFormValue {
  if (v === true) return 'yes';
  if (v === false) return 'no';
  return '';
}

export function womenBookingFromForm(v: WomenBookingFormValue): boolean | null {
  if (v === 'yes') return true;
  if (v === 'no') return false;
  return null;
}
