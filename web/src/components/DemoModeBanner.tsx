'use client';

import { isDemoFrontend } from '@/lib/demo';

export function DemoModeBanner() {
  if (!isDemoFrontend()) return null;
  return (
    <div className="demo-mode-banner" role="status">
      حالت نمایشی — داده‌ها ممکن است با سرور واقعی متفاوت باشد. برای محیط
      عملیاتی <code>NEXT_PUBLIC_API_URL</code> را تنظیم کنید.
    </div>
  );
}
