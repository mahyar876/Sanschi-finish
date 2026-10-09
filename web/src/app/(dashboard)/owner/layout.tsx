'use client';

import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell';
import { OWNER_NAV } from '@/lib/dashboard-nav';

export default function OwnerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardAppShell requireRole="owner" navOverride={OWNER_NAV}>
      {children}
    </DashboardAppShell>
  );
}
