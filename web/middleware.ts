import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEV_ONLY_PREFIXES = ['/payment/test', '/mobile-preview', '/dev'];

/** در production هم پیش‌نمایش رسپانسیو برای بررسی UI بدون OTP */
const PUBLIC_PREVIEW_PREFIXES = ['/responsive-preview'];

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }
  const path = request.nextUrl.pathname;
  if (PUBLIC_PREVIEW_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.next();
  }
  if (DEV_ONLY_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/payment/test',
    '/payment/test/:path*',
    '/mobile-preview',
    '/mobile-preview/:path*',
    '/responsive-preview',
    '/responsive-preview/:path*',
    '/dev',
    '/dev/:path*',
  ],
};
