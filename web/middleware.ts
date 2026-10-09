import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const DEV_ONLY_PREFIXES = ['/payment/test', '/mobile-preview'];

export function middleware(request: NextRequest) {
  if (process.env.NODE_ENV !== 'production') {
    return NextResponse.next();
  }
  const path = request.nextUrl.pathname;
  if (DEV_ONLY_PREFIXES.some((p) => path === p || path.startsWith(`${p}/`))) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ['/payment/test', '/payment/test/:path*', '/mobile-preview', '/mobile-preview/:path*'],
};
