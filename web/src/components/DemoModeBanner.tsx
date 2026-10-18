'use client';

import { isDemoFrontend } from '@/lib/demo';

export function DemoModeBanner() {
  if (!isDemoFrontend()) return null;
  return (
    <div className="demo-mode-banner" role="status">
      حالت نمایشی — قفل سانس و جلوگیری از رزرو همزمان غیرفعال است. Express را
      اجرا کنید و بدون <code>NEXT_PUBLIC_DEMO_MODE=true</code> کار کنید.
    </div>
  );
}
