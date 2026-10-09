import { setSession, type SessionUser } from '@/lib/session';

/** حالت نمایشی: بدون NEXT_PUBLIC_API_URL یا با NEXT_PUBLIC_DEMO_MODE=true */
export function isDemoFrontend(): boolean {
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'false') return false;
  if (process.env.NEXT_PUBLIC_API_URL) return false;
  return true;
}

export const DEMO_OTP = '1234';

/** شماره مالک / مدیر پلتفرم (پنل ادمین) */
export const SITE_OWNER_PHONE = '09337752754';

export function demoLoginAs(role: SessionUser['role'], name?: string, phone?: string) {
  const user: SessionUser = {
    id:
      role === 'admin' ? 'demo-admin' : role === 'owner' ? 'demo-owner' : 'demo-user',
    name:
      name ||
      (role === 'admin'
        ? 'مدیر نمایشی'
        : role === 'owner'
          ? 'مالک نمایشی'
          : 'کاربر نمایشی'),
    phone: phone || (role === 'admin' ? SITE_OWNER_PHONE : '09120000000'),
    email:
      role === 'admin'
        ? 'admin@demo.local'
        : role === 'owner'
          ? 'owner@demo.local'
          : 'user@demo.local',
    role,
  };
  setSession(`demo-token-${role}`, user);
  return user;
}

export function demoRegisterUser(input: {
  name: string;
  phone: string;
  email?: string;
}) {
  return demoLoginAs('user', input.name, input.phone);
}
