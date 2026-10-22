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

function NoticeIconUnavailable() {
  return (
    <svg
      className="women-booking-notice-icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 8v5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16" r="0.9" fill="currentColor" />
    </svg>
  );
}

function NoticeIconOk() {
  return (
    <svg
      className="women-booking-notice-icon"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8 12.5l2.5 2.5L16 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function WomenBookingNotice({ allowed, intentWomen = false, className = '' }: Props) {
  const extra = className ? ` ${className}` : '';

  if (womenBookingUnavailable(allowed)) {
    return (
      <div
        className={`women-booking-notice women-booking-notice--unavailable${extra}`}
        role={intentWomen ? 'alert' : 'status'}
      >
        <NoticeIconUnavailable />
        <p className="women-booking-notice-text">{WOMEN_BOOKING_UNAVAILABLE_MSG}</p>
      </div>
    );
  }

  if (allowed === true) {
    return (
      <div className={`women-booking-notice women-booking-notice--ok${extra}`}>
        <NoticeIconOk />
        <p className="women-booking-notice-text">{womenBookingLabel(true)}</p>
      </div>
    );
  }

  return null;
}
