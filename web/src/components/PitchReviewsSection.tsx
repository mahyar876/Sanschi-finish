'use client';

import { useState } from 'react';
import Link from 'next/link';
import { numFa } from '@/lib/jalali';
import {
  REVIEW_CATEGORIES,
  averageCategoryRatings,
  type ReviewCategoryRatings,
} from '@/lib/review-categories';

export type PitchReview = {
  _id?: string;
  rating: number;
  text: string;
  createdAt?: string;
  authorName?: string;
  categoryRatings?: ReviewCategoryRatings | null;
  ownerReply?: { text: string; createdAt?: string } | null;
};

function stars(n: number) {
  const r = Math.round(Math.min(5, Math.max(0, n)));
  return `${'★'.repeat(r)}${'☆'.repeat(5 - r)}`;
}

function timeAgoFa(iso?: string): string {
  if (!iso) return '';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const diff = Date.now() - d.getTime();
  const days = Math.floor(diff / (86400000));
  if (days < 1) return 'امروز';
  if (days < 7) return `${numFa(days)} روز پیش`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${numFa(weeks)} هفته پیش`;
  const months = Math.floor(days / 30);
  return `${numFa(months)} ماه پیش`;
}

function CategoryBars({ averages }: { averages: ReviewCategoryRatings }) {
  return (
    <ul className="review-category-bars">
      {REVIEW_CATEGORIES.map(({ key, label }) => {
        const v = averages[key];
        if (v == null) return null;
        const pct = (v / 5) * 100;
        return (
          <li key={key}>
            <span className="review-cat-label">{label}</span>
            <span className="review-cat-bar" aria-hidden>
              <span className="review-cat-fill" style={{ width: `${pct}%` }} />
            </span>
            <span className="review-cat-val">{numFa(v)}</span>
          </li>
        );
      })}
    </ul>
  );
}

type Props = {
  reviews: PitchReview[];
};

export function PitchReviewsSection({ reviews }: Props) {
  const [openDetail, setOpenDetail] = useState<string | null>(null);

  if (!reviews.length) {
    return (
      <section className="section pitch-reviews-section">
        <h2>نظرات</h2>
        <p className="muted-sm">
          هنوز نظری ثبت نشده. پس از بازی، از{' '}
          <Link href="/player/reservations">رزروهای من</Link> می‌توانید نظر بگذارید.
        </p>
      </section>
    );
  }

  const avg =
    reviews.reduce((s, r) => s + r.rating, 0) / reviews.length;
  const catAvg = averageCategoryRatings(reviews);
  const hasCats = Object.keys(catAvg).length > 0;

  return (
    <section className="section pitch-reviews-section" aria-labelledby="pitch-reviews-title">
      <h2 id="pitch-reviews-title">نظرات</h2>

      <div className="review-summary-card panel">
        <div className="review-summary-score">
          <span className="review-summary-num">{numFa(Math.round(avg * 10) / 10)}</span>
          <span className="review-summary-stars" aria-label={`امتیاز ${numFa(avg)} از ۵`}>
            {stars(avg)}
          </span>
          <span className="muted-sm">{numFa(reviews.length)} نظر</span>
        </div>
        {hasCats ? <CategoryBars averages={catAvg} /> : null}
      </div>

      <p className="review-submit-hint muted-sm">
        ثبت نظر فقط پس از اتمام سانس —{' '}
        <Link href="/player/reservations">رزروهای من</Link>
      </p>

      <ul className="review-cards">
        {reviews.map((r, i) => {
          const id = r._id || String(i);
          const detailOpen = openDetail === id;
          const hasDetail =
            r.categoryRatings && Object.keys(r.categoryRatings).length > 0;
          return (
            <li key={id} className="panel review-card">
              <div className="review-card-head">
                <strong>{r.authorName || 'بازیکن'}</strong>
                <span className="review-card-stars">{stars(r.rating)}</span>
                <span className="muted-sm review-card-when">{timeAgoFa(r.createdAt)}</span>
              </div>
              {hasDetail ? (
                <button
                  type="button"
                  className="review-detail-toggle btn btn-ghost btn-sm"
                  aria-expanded={detailOpen}
                  onClick={() => setOpenDetail(detailOpen ? null : id)}
                >
                  جزئیات امتیاز
                </button>
              ) : null}
              {detailOpen && hasDetail ? (
                <CategoryBars averages={r.categoryRatings!} />
              ) : null}
              {r.text?.trim() ? <p className="review-card-text">{r.text}</p> : null}
              {r.ownerReply?.text ? (
                <blockquote className="review-owner-reply">
                  <span className="review-owner-reply-label">پاسخ مجموعه</span>
                  <p>{r.ownerReply.text}</p>
                </blockquote>
              ) : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
