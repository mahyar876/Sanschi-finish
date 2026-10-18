'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import {
  isFavoritePitch,
  PENDING_FAVORITE_KEY,
  subscribeFavorites,
  toggleFavoritePitch,
} from '@/lib/favorites';
import { getToken, getUser } from '@/lib/session';

type Props = {
  pitchId: string;
  className?: string;
  /** کوچک برای کارت رزرو */
  compact?: boolean;
};

export function FavoritePitchButton({ pitchId, className = '', compact }: Props) {
  const router = useRouter();
  const [active, setActive] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setActive(isFavoritePitch(pitchId));
    return subscribeFavorites(() => setActive(isFavoritePitch(pitchId)));
  }, [pitchId]);

  const onClick = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (!pitchId) return;

      if (!getToken() || !getUser()) {
        sessionStorage.setItem(PENDING_FAVORITE_KEY, pitchId);
        const here =
          typeof window !== 'undefined'
            ? window.location.pathname + window.location.search
            : '/gallery';
        router.push(`/login?redirect=${encodeURIComponent(here)}&tab=register`);
        return;
      }

      setBusy(true);
      try {
        const favorited = await toggleFavoritePitch(pitchId);
        setActive(favorited);
      } catch {
        /* toast optional */
      } finally {
        setBusy(false);
      }
    },
    [pitchId, router],
  );

  return (
    <button
      type="button"
      className={`favorite-pitch-btn ${active ? 'is-active' : ''} ${compact ? 'favorite-pitch-btn--compact' : ''} ${className}`.trim()}
      aria-pressed={active}
      aria-label={active ? 'حذف از علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
      title={active ? 'در علاقه‌مندی‌ها' : 'افزودن به علاقه‌مندی‌ها'}
      disabled={busy}
      onClick={onClick}
    >
      <span className="favorite-pitch-icon" aria-hidden />
    </button>
  );
}
