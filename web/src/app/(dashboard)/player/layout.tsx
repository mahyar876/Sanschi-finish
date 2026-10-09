'use client';

import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell';

export default function PlayerDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <DashboardAppShell requireRole="any" preferOwnerNav>
      {children}
    </DashboardAppShell>
  );
}
