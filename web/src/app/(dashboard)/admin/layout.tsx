'use client';

import { DashboardAppShell } from '@/components/dashboard/DashboardAppShell';

export default function AdminDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <DashboardAppShell requireRole="admin">{children}</DashboardAppShell>;
}
