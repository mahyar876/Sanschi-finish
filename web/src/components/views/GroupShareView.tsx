'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { GroupSplitCalculator } from '@/components/booking/GroupSplitCalculator';
import { parseShareFromSearchParams, type GroupSplitSharePayload } from '@/lib/group-split-share';
import { fetchTeamShareByCode } from '@/lib/team-split-api';

export function GroupShareView() {
  const search = useSearchParams();
  const queryKey = search.toString();
  const staticPayload = useMemo(
    () => parseShareFromSearchParams(search),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- keyed by serialized query
    [queryKey],
  );
  const shareCode = search.get('code') || staticPayload?.reservationCode || '';
  const [livePayload, setLivePayload] = useState<GroupSplitSharePayload | null>(null);
  const [liveLoading, setLiveLoading] = useState(false);

  useEffect(() => {
    if (!shareCode || shareCode === '—') {
      setLivePayload(null);
      return;
    }
    let cancelled = false;
    setLiveLoading(true);
    void fetchTeamShareByCode(shareCode)
      .then((p) => {
        if (!cancelled) setLivePayload(p);
      })
      .finally(() => {
        if (!cancelled) setLiveLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shareCode]);

  const payload = useMemo((): GroupSplitSharePayload | null => {
    if (livePayload) {
      return {
        ...(staticPayload || livePayload),
        ...livePayload,
        checklist: livePayload.checklist?.length
          ? livePayload.checklist
          : staticPayload?.checklist,
        pay: livePayload.pay ?? staticPayload?.pay,
      };
    }
    return staticPayload;
  }, [staticPayload, livePayload]);

  if (!payload && !liveLoading) {
    return (
      <div className="page page-narrow">
        <header className="page-hero">
          <p className="eyebrow">اشتراک سانس</p>
          <h1>لینک نامعتبر یا منقضی</h1>
          <p className="subtitle">
            این صفحه با لینکی که رزروکننده از مرحلهٔ رزرو فرستاده باز می‌شود. اگر لینک را
            دارید، دوباره از گروه باز کنید.
          </p>
        </header>
        <div className="hero-actions">
          <Link href="/reserve" className="btn btn-primary">
            رزرو سانس
          </Link>
          <Link href="/" className="btn btn-secondary">
            خانه
          </Link>
        </div>
      </div>
    );
  }

  if (!payload) {
    return (
      <div className="page page-narrow">
        <p className="subtitle">در حال بارگذاری…</p>
      </div>
    );
  }

  return (
    <div className="page page-narrow page-group-share">
      <header className="page-hero">
        <p className="eyebrow">جزئیات برای گروه</p>
        <h1>سهم هر نفر در این سانس</h1>
        <p className="subtitle">
          سهم تقریبی و وضعیت چک‌لیست تیم — پرداخت سانس فقط از سانس‌چی است.
          {livePayload ? ' (به‌روز از رزرو)' : null}
        </p>
      </header>

      <GroupSplitCalculator
        mode="readonly"
        totalAmount={payload.amount}
        pitchName={payload.pitchName}
        date={payload.date}
        time={payload.time}
        bookerName={payload.bookerName}
        reservationCode={payload.reservationCode}
        defaultPlayers={payload.players}
        checklist={payload.checklist}
        payInfo={payload.pay}
      />
      <div className="hero-actions" style={{ justifyContent: 'center', marginTop: '0.75rem' }}>
        <Link href="/reserve" className="btn btn-secondary btn-sm">
          خودم هم می‌خواهم رزرو کنم
        </Link>
      </div>
    </div>
  );
}
