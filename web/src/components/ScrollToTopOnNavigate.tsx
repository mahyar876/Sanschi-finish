'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';

/** بعد از هر ناوبری، از بالای صفحه (هدر) نمایش داده شود */
export function ScrollToTopOnNavigate() {
  const pathname = usePathname();

  useEffect(() => {
    window.scrollTo(0, 0);
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [pathname]);

  return null;
}
