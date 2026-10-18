export const SETTLEMENT_STATUS: Record<
  string,
  { label: string; className: string }
> = {
  pending: { label: 'در انتظار', className: 'settle-status settle-status--pending' },
  approved: { label: 'تأیید‌شده', className: 'settle-status settle-status--approved' },
  paid: { label: 'پرداخت‌شده', className: 'settle-status settle-status--paid' },
  rejected: { label: 'رد‌شده', className: 'settle-status settle-status--rejected' },
};

export function settlementStatusLabel(status: string): string {
  return SETTLEMENT_STATUS[status]?.label || status;
}

export function settlementStatusClass(status: string): string {
  return SETTLEMENT_STATUS[status]?.className || 'settle-status';
}
