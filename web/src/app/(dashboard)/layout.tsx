'use client';

import { usePathname } from 'next/navigation';
import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell';

export default function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  if (
    pathname.startsWith('/admin') ||
    pathname.startsWith('/owner') ||
    pathname.startsWith('/player')
  ) {
    return children;
  }
  const preferOwnerNav =
    pathname === '/finance' ||
    pathname === '/settlement' ||
    pathname.startsWith('/finance/');
  return (
    <DashboardAppShell requireRole="any" preferOwnerNav={preferOwnerNav}>
      {children}
    </DashboardAppShell>
  );
}
