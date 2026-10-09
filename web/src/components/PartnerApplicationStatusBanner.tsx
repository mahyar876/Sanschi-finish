'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import {
  APPLICATION_STATUS_LABEL,
  fetchMyOwnerApplication,
  type OwnerApplication,
} from '@/lib/owner-applications';
import { getUser, type SessionUser } from '@/lib/session';

type Props = {
  /** پس از /auth/me نقش به‌روز شده */
  user?: SessionUser | null;
};

export function PartnerApplicationStatusBanner({ user: userProp }: Props) {
  const pathname = usePathname();
  const [app, setApp] = useState<OwnerApplication | null>(null);
  const user = userProp ?? getUser();

  useEffect(() => {
    if (!user?.phone) {
      setApp(null);
      return;
    }
    void fetchMyOwnerApplication()
      .then(setApp)
      .catch(() => setApp(null));
  }, [user?.phone]);

  if (!app) return null;

  if (app.status === 'needs_revision') {
    return (
      <div className="panel dash-alert dash-alert-warn" role="status">
        <strong>درخواست همکاری — {APPLICATION_STATUS_LABEL.needs_revision}</strong>
        <p className="partner-detail-multiline" style={{ margin: '0.5rem 0 0' }}>
          {app.revisionNote || 'لطفاً اطلاعات را اصلاح و دوباره ارسال کنید.'}
        </p>
        <p className="muted-sm" style={{ marginTop: '0.5rem' }}>
          فرم همکاری را با همان شماره موبایل ({user?.phone}) دوباره پر کنید. اعلان هم در{' '}
          <Link href={user?.role === 'owner' ? '/owner/messages' : '/player/notifications'}>
            اعلان‌ها
          </Link>{' '}
          ثبت می‌شود.
        </p>
        <Link href="/for-owners" className="btn btn-secondary btn-sm" style={{ marginTop: '0.75rem' }}>
          اصلاح و ارسال مجدد
        </Link>
      </div>
    );
  }

  if (app.status === 'pending') {
    return (
      <div className="panel dash-alert" role="status">
        درخواست همکاری «{app.venueName}» در صف بررسی است. نتیجه را در{' '}
        <Link href={user?.role === 'owner' ? '/owner/messages' : '/player/notifications'}>
          اعلان‌ها
        </Link>{' '}
        می‌بینید.
      </div>
    );
  }

  if (app.status === 'approved' || app.status === 'approved_awaiting_signup') {
    if (user?.role === 'owner') {
      if (pathname.startsWith('/owner')) return null;
      return (
        <div className="panel dash-alert dash-alert-success" role="status">
          درخواست «{app.venueName}» تأیید شد —{' '}
          <Link href="/owner">پنل صاحب زمین</Link> برای شما فعال است.
        </div>
      );
    }
    return (
      <div className="panel dash-alert" role="status">
        درخواست «{app.venueName}» تأیید شده. یک‌بار{' '}
        <Link href="/login">خروج و ورود مجدد</Link> کنید تا پنل صاحب زمین باز شود.
      </div>
    );
  }

  if (app.status === 'rejected') {
    return (
      <div className="panel dash-alert dash-alert-warn" role="status">
        درخواست «{app.venueName}» رد شد.
        {app.rejectReason ? ` ${app.rejectReason}` : ''}
      </div>
    );
  }

  return null;
}
