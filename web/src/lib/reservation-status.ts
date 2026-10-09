export const RESERVATION_STATUS_FA: Record<string, string> = {

  pending: 'در انتظار پرداخت',

  paid: 'پرداخت‌شده',

  cancelled: 'لغو شده',

  completed: 'انجام‌شده',

  blocked: 'مسدود',

  pending_payment: 'در انتظار پرداخت',

  payment_failed: 'پرداخت ناموفق',

  confirmed: 'تأیید شده',

  cancelled_by_user: 'لغو توسط شما',

  cancelled_by_owner: 'لغو توسط مجموعه',

  refund_pending: 'در انتظار بازپرداخت',

  refunded: 'بازپرداخت شده',

  checked_in: 'ورود ثبت‌شده',

  no_show: 'عدم مراجعه',

  expired: 'منقضی شده',

};



export function statusBadgeClass(status: string): string {

  if (status === 'pending' || status === 'pending_payment') return 'pending';

  if (

    status === 'paid' ||

    status === 'completed' ||

    status === 'confirmed' ||

    status === 'checked_in'

  )

    return 'paid';

  if (

    status === 'cancelled' ||

    status === 'cancelled_by_user' ||

    status === 'cancelled_by_owner' ||

    status === 'expired'

  )

    return 'cancelled';

  return 'pending';

}



export function displayStatusFa(status: string, bookingStatus?: string): string {

  if (bookingStatus && RESERVATION_STATUS_FA[bookingStatus]) {

    return RESERVATION_STATUS_FA[bookingStatus];

  }

  return RESERVATION_STATUS_FA[status] || status;

}


