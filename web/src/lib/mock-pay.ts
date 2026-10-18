/**
 * پرداخت ساختگی برای تست — در development پیش‌فرض روشن است.
 * در production فقط با NEXT_PUBLIC_ALLOW_MOCK_PAY=true (و ALLOW_MOCK_PAY روی بک‌اند).
 */
export function isMockPayEnabled(): boolean {
  const flag = process.env.NEXT_PUBLIC_ALLOW_MOCK_PAY;
  if (flag === 'true') return true;
  if (flag === 'false') return false;
  return process.env.NODE_ENV === 'development';
}
