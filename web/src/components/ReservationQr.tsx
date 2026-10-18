'use client';

import Link from 'next/link';
import { qrChartImageUrl, reservationQrPayload, reservationVerifyPath } from '@/lib/reservation-qr';

type Props = {
  code: string;
  size?: number;
  className?: string;
  showCaption?: boolean;
};

export function ReservationQr({ code, size = 160, className, showCaption = true }: Props) {
  const payload = reservationQrPayload(code);
  const path = reservationVerifyPath(code);
  if (!payload || !path) return null;

  return (
    <div className={className ?? 'res-qr-block'}>
      <img
        src={qrChartImageUrl(payload, size)}
        alt={`QR تأیید رزرو ${code}`}
        width={size}
        height={size}
        className="res-qr-placeholder"
      />
      {showCaption ? (
        <>
          <p className="muted-sm res-qr-caption">
            اسکن کنید — نام زمین، سانس و رزروکننده برای تأیید در مجموعه
          </p>
          <Link href={path} className="muted-sm res-qr-link">
            {code}
          </Link>
        </>
      ) : null}
    </div>
  );
}
