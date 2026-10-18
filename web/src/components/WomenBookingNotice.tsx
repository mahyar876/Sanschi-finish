import {
  WOMEN_BOOKING_UNAVAILABLE_MSG,
  womenBookingLabel,
  womenBookingUnavailable,
  type WomenBookingAllowed,
} from '@/lib/women-booking';

type Props = {
  allowed: WomenBookingAllowed;
  /** کاربر «تیم بانوان» را در فرم رزرو انتخاب کرده — پیام با role=alert */
  intentWomen?: boolean;
  className?: string;
};

export function WomenBookingNotice({ allowed, intentWomen = false, className = '' }: Props) {
  if (womenBookingUnavailable(allowed)) {
    return (
      <p
        className={`women-booking-notice women-booking-notice--unavailable${className ? ` ${className}` : ''}`}
        role={intentWomen ? 'alert' : 'status'}
      >
        {WOMEN_BOOKING_UNAVAILABLE_MSG}
      </p>
    );
  }

  if (allowed === true) {
    return (
      <p className={`women-booking-notice women-booking-notice--ok${className ? ` ${className}` : ''}`}>
        {womenBookingLabel(true)}
      </p>
    );
  }

  return null;
}
