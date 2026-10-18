import { setSession, type SessionUser } from '@/lib/session';

/**
 * حالت نمایشی فقط با NEXT_PUBLIC_DEMO_MODE=true.
 * در dev با پروکسی /api → Express، پیش‌فرض «واقعی» است (قفل سانس روی سرور).
 */
export function isDemoFrontend(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
}

export function isDemoPitchId(pitchId: string): boolean {
  return pitchId.startsWith('demo-');
}

/** قفل و رزرو از API + MongoDB (جلوگیری از رزرو همزمان) */
export function isLiveBookingForPitch(pitchId: string): boolean {
  if (!pitchId || isDemoFrontend()) return false;
  return !isDemoPitchId(pitchId);
}

/** ورود سریع نمایشی روی login و boot پنل — فقط development یا حالت demo */
export function showDevQuickLogin(): boolean {
  return isDemoFrontend() || process.env.NODE_ENV === 'development';
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
