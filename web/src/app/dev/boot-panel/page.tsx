'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useEffect } from 'react';
import { demoLoginAs } from '@/lib/demo';
import { isDevPanelBootAllowed, type DevPanelRole } from '@/lib/dev-panels';
import { dashboardHomeForRole } from '@/lib/dashboard-nav';

function parseRole(raw: string | null): DevPanelRole | null {
  if (raw === 'admin' || raw === 'owner' || raw === 'user') return raw;
  return null;
}

function BootPanelInner() {
  const sp = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    if (!isDevPanelBootAllowed()) {
      router.replace('/');
      return;
    }
    const role = parseRole(sp.get('role'));
    if (!role) {
      router.replace('/');
      return;
    }
    demoLoginAs(role);
    router.replace(dashboardHomeForRole(role));
  }, [router, sp]);

  return (
    <div className="auth-wrap" style={{ padding: '2rem', textAlign: 'center' }}>
      <p className="muted-sm">در حال ورود به پنل…</p>
    </div>
  );
}

export default function DevBootPanelPage() {
  return (
    <Suspense
      fallback={
        <div className="auth-wrap" style={{ padding: '2rem', textAlign: 'center' }}>
          <p className="muted-sm">…</p>
        </div>
      }
    >
      <BootPanelInner />
    </Suspense>
  );
}
