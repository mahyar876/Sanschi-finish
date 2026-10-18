'use client';

import { useEffect, useState } from 'react';

/** هم‌تراز با breakpoint گالری و فیلترهای جمع‌شونده */
export const COMPACT_LAYOUT_QUERY = '(max-width: 959px)';

export function useCompactLayout(query: string = COMPACT_LAYOUT_QUERY): boolean {
  const [compact, setCompact] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setCompact(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);

  return compact;
}
