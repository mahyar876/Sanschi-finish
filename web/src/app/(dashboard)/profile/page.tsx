'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { profilePath } from '@/lib/account-home';
import { getUser } from '@/lib/session';

export default function LegacyProfileRedirect() {
  const router = useRouter();

  useEffect(() => {
    const u = getUser();
    if (!u) {
      router.replace('/login?redirect=/player/profile');
      return;
    }
    router.replace(profilePath(u.role));
  }, [router]);

  return (
    <div className="page page-narrow">
      <p className="subtitle">در حال انتقال به پروفایل…</p>
    </div>
  );
}
