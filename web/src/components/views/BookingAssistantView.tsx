'use client';

import type { CSSProperties, FormEvent, KeyboardEvent } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { VenueCard } from '@/components/VenueCard';
import type { VenueCategory } from '@/data/venues';
import { ApiError, apiFetch } from '@/lib/fetch-api';
import { fetchCatalog, type CatalogVenue } from '@/lib/catalog';
import { DEFAULT_CATEGORY_IMAGE } from '@/lib/venue-images';
import { inferTehranZone } from '@/lib/tehran-zones';
import { numFa } from '@/lib/jalali';
import { DEFAULT_SLOT_TIMES } from '@/lib/pitch-types';
import { displaySlotTime } from '@/lib/slot-time';

type RecommendResult = {
  pitchId: string;
  name: string;
  type: string;
  size: number;
  address: string;
  womenBookingAllowed: boolean | null;
  popularity90d: number;
  venueCategory?: VenueCategory;
  date?: string;
  slot: {
    slotIndex: number;
    time: string;
    sitePrice: number;
    flashDeal?: boolean;
    durationHours?: number;
  };
};

type AssistantIntent = {
  date?: string;
  dateLabel?: string;
  hour?: number;
  minute?: number;
  timeRange?: { startHour: number; endHour: number } | null;
  pitchType?: string | null;
  venueCategory?: VenueCategory | 'indoor' | null;
  district?: string | null;
  flexibleTime?: boolean;
  needsClarification?: boolean;
  warnings?: string[];
};

type ChatResponse = {
  success: boolean;
  sessionId?: string;
  reply?: string;
  summary?: string;
  intent?: AssistantIntent;
  results?: RecommendResult[];
  needsInput?: boolean;
  message?: string;
};

type ChatMsg = { id: string; role: 'user' | 'assistant'; text: string };

const STARTERS = [
  'فردا ساعت ۷ شب زمین میخوام',
  'پس فردا یه زمین چمن',
  '۳ روز دیگه ساعت ۷ شب',
];

type BookingAssistantViewProps = {
  /** embedded on homepage vs full /assistant page */
  variant?: 'page' | 'home';
};

function categoryFromType(type: string, venueCategory?: VenueCategory): VenueCategory {
  if (venueCategory) return venueCategory;
  return type === 'grass' ? 'grass' : 'futsal';
}

function catalogFromRecommend(r: RecommendResult, base?: CatalogVenue): CatalogVenue {
  const category = categoryFromType(r.type, r.venueCategory);
  const size = (r.size === 7 ? 7 : r.size === 11 ? 11 : 5) as 5 | 7 | 11;
  if (base) {
    return {
      ...base,
      name: r.name || base.name,
      category,
      address: r.address || base.address,
      priceFrom: r.slot.sitePrice,
      availSlots: 1,
      womenBookingAllowed: r.womenBookingAllowed ?? base.womenBookingAllowed,
      featured: r.slot.flashDeal || base.featured,
    };
  }
  return {
    pitchId: r.pitchId,
    slug: `pitch-${r.pitchId.replace(/[^a-zA-Z0-9]/g, '').slice(-10)}`,
    name: r.name,
    category,
    size,
    priceFrom: r.slot.sitePrice,
    availSlots: 1,
    address: r.address,
    city: 'تهران',
    zone: inferTehranZone(r.address),
    tags: r.slot.flashDeal ? ['تخفیف لحظه‌آخر'] : [],
    image: DEFAULT_CATEGORY_IMAGE[category],
    seoDescription: '',
    womenBookingAllowed: r.womenBookingAllowed,
    featured: !!r.slot.flashDeal,
    amenities: [],
    slotTimes: r.slot.time ? [r.slot.time] : [...DEFAULT_SLOT_TIMES],
  };
}

function intentChip(intent: AssistantIntent | null): string | null {
  if (!intent?.date) return null;
  const parts = [intent.dateLabel || intent.date];
  if (intent.timeRange && !intent.flexibleTime) {
    parts.push(
      `ساعت ${numFa(intent.timeRange.startHour % 24 || intent.timeRange.startHour)} تا ${numFa(intent.timeRange.endHour % 24 || intent.timeRange.endHour)}`,
    );
  } else if (intent.hour != null && !intent.flexibleTime) {
    parts.push(`ساعت ${numFa(intent.hour)}`);
  }
  const typeLabels: Record<string, string> = {
    grass: 'چمن',
    futsal: 'فوتسال',
    volleyball: 'والیبال',
    multi: 'چندمنظوره',
    indoor: 'سالن',
  };
  const typeLabel = typeLabels[intent.venueCategory || intent.pitchType || ''];
  if (typeLabel) parts.push(typeLabel);
  if (intent.district) parts.push(intent.district);
  return parts.join(' · ');
}

export function BookingAssistantView({ variant = 'page' }: BookingAssistantViewProps) {
  const isHome = variant === 'home';
  const inputId = isHome ? 'assistant-chat-input-home' : 'assistant-chat-input';
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<ChatMsg[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'سلام! بگو چه روزی، کجای تهران، چه ساعتی و چه نوع فضایی می‌خوای.',
    },
  ]);
  const [sessionId, setSessionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [intent, setIntent] = useState<AssistantIntent | null>(null);
  const [results, setResults] = useState<RecommendResult[]>([]);
  const [catalog, setCatalog] = useState<CatalogVenue[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const focusChatInput = useCallback(() => {
    requestAnimationFrame(() => {
      const el = inputRef.current;
      if (!el || el.disabled) return;
      el.focus({ preventScroll: true });
    });
  }, []);

  useEffect(() => {
    void fetchCatalog()
      .then(({ items }) => setCatalog(items))
      .catch(() => {});
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    if (!loading) focusChatInput();
  }, [loading, messages.length, focusChatInput]);

  const catalogById = useMemo(
    () => new Map(catalog.map((c) => [c.pitchId, c])),
    [catalog],
  );

  const intentDate = intent?.date || results[0]?.date || '';

  const displayVenues = useMemo(() => {
    return results.map((r) => {
      const venue = catalogFromRecommend(r, catalogById.get(r.pitchId));
      const date = r.date || intentDate;
      const q = new URLSearchParams({
        pitchId: r.pitchId,
        venue: venue.slug,
        ...(date ? { date } : {}),
        slot: String(r.slot.slotIndex),
      });
      return {
        venue,
        reserveHref: `/reserve?${q.toString()}`,
        availLabel:
          r.slot.durationHours && r.slot.durationHours > 1
            ? `سانس ${displaySlotTime(r.slot.time)} · ${numFa(r.slot.durationHours)} ساعت`
            : `سانس ${displaySlotTime(r.slot.time)}`,
      };
    });
  }, [results, catalogById, intentDate]);

  /** ثابت ۴ ستون تا با کم بودن نتیجه کارت‌ها کش نیایند */
  const gridCols = displayVenues.length > 0 ? 4 : 1;

  async function sendText(text: string) {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError('');
    setInput('');
    const userMsg: ChatMsg = { id: `u-${Date.now()}`, role: 'user', text: trimmed };
    setMessages((m) => [...m, userMsg]);
    setLoading(true);
    setResults([]);

    try {
      const data = await apiFetch<ChatResponse>('/assistant/chat', {
        method: 'POST',
        body: JSON.stringify({
          message: trimmed,
          sessionId: sessionId || undefined,
          limit: 6,
        }),
      });
      if (!data.success) {
        setError(data.message || 'خطا');
        return;
      }
      if (data.sessionId) setSessionId(data.sessionId);
      if (data.intent) setIntent(data.intent);
      setResults(data.results || []);
      const assistantText = data.reply || data.summary || 'بررسی شد.';
      setMessages((m) => [
        ...m,
        { id: `a-${Date.now()}`, role: 'assistant', text: assistantText },
      ]);
    } catch (err) {
      if (err instanceof ApiError && err.status === 404) {
        setError(
          'سرویس دستیار روی سرور فعال نیست. backend را ری‌استارت کنید (پورت ۵۰۰۰).',
        );
      } else {
        setError(err instanceof Error ? err.message : 'ارتباط با سرور برقرار نشد');
      }
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    void sendText(input);
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void sendText(input);
    }
  }

  const chip = intentChip(intent);

  return (
    <div
      className={`assistant-page${isHome ? ' assistant-page--home' : ' page'}`}
      id={isHome ? 'home-assistant' : undefined}
    >
      {isHome ? (
        <header className="home-assistant-intro" aria-labelledby="home-assistant-title">
          <p className="eyebrow">دستیار هوشمند</p>
          <h2 id="home-assistant-title">
            بگو کی می‌خوای بازی کنی، <em>سانس پیشنهاد می‌دهیم</em>
          </h2>
          <p className="home-assistant-lead">
            مثل چت — «فردا ۷ شب چمن» — از بین سانس‌های واقعی مجموعه‌ها.
          </p>
        </header>
      ) : (
        <header className="page-hero assistant-hero-compact">
          <p className="eyebrow">دستیار هوشمند سانس‌چی</p>
          <h1>رزرو با زبان خودت</h1>
          <p className="subtitle">
            چند بار می‌توانی پیام بدهی — تاریخ و ساعت از سانس‌های واقعی دیتابیس پیشنهاد
            می‌شود.
          </p>
        </header>
      )}

      {!isHome && (
        <section className="assistant-usage-guide" aria-labelledby="assistant-guide-title">
          <div className="assistant-guide-heading">
            <span className="assistant-guide-badge" aria-hidden="true">
              ؟
            </span>
            <div>
              <h2 id="assistant-guide-title">چطور درخواستت را بنویسی؟</h2>
              <p>این چهار مورد را یکجا یا در چند پیام بفرست.</p>
            </div>
          </div>
          <ol className="assistant-guide-steps">
            <li>
              <strong>روز</strong>
              <span>مثل امروز، فردا، پس‌فردا یا پنجشنبه</span>
            </li>
            <li>
              <strong>محدوده</strong>
              <span>نام محله یا سمتی از تهران، مثل پیروزی یا غرب</span>
            </li>
            <li>
              <strong>ساعت</strong>
              <span>ساعت دقیق مثل ۴ ظهر، یا بازه‌ای مثل ۶ تا ۹ شب</span>
            </li>
            <li>
              <strong>نوع فضا</strong>
              <span>چمن، فوتسال، والیبال، چندمنظوره یا فقط سالن</span>
            </li>
          </ol>
          <div className="assistant-guide-example">
            <span>نمونهٔ کامل</span>
            <b>«پس‌فردا، پیروزی، ساعت ۴ ظهر، زمین چمن»</b>
          </div>
          <p className="assistant-guide-note">
            می‌توانی «زمین»، «فوتبال» یا «چمن» بگویی. اگر سالن می‌خواهی، نوع آن را هم
            می‌توانی مشخص کنی. دستیار فقط اطلاعات جاافتاده را ازت می‌پرسد.
          </p>
        </section>
      )}

      <section
        className={`panel assistant-chat-panel${isHome ? ' home-assistant-panel' : ''}`}
      >
        <div className="assistant-chat-log" ref={scrollRef} aria-live="polite">
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`assistant-chat-bubble assistant-chat-bubble--${msg.role}`}
            >
              {msg.text}
            </div>
          ))}
          {loading && (
            <div className="assistant-chat-bubble assistant-chat-bubble--assistant assistant-chat-typing">
              در حال جستجو…
            </div>
          )}
        </div>

        {chip && (
          <p className="assistant-intent-chip muted-sm">
            تفسیر: <strong>{chip}</strong>
          </p>
        )}

        <form onSubmit={onSubmit} className="assistant-chat-form">
          <div className="field assistant-field">
            <label htmlFor={inputId} className="visually-hidden">
              پیام
            </label>
            <textarea
              ref={inputRef}
              id={inputId}
              className="assistant-input assistant-chat-input"
              rows={2}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder="پیام خود را بنویسید…"
              disabled={loading}
              aria-busy={loading}
            />
          </div>
          <div className="assistant-chat-actions">
            <div className="assistant-examples">
              {STARTERS.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  className="chip"
                  disabled={loading}
                  onClick={() => void sendText(ex)}
                >
                  {ex.length > 36 ? `${ex.slice(0, 36)}…` : ex}
                </button>
              ))}
            </div>
            <button
              type="submit"
              className="btn btn-primary assistant-send-btn"
              disabled={loading || !input.trim()}
              onMouseDown={(e) => e.preventDefault()}
            >
              ارسال
            </button>
          </div>
        </form>
        {error && <p className="notice assistant-error">{error}</p>}
      </section>

      {displayVenues.length > 0 && (
        <section
          className={`assistant-venues-section${isHome ? '' : ' section'}`}
        >
          <h2 className="assistant-results-title">پیشنهادها</h2>
          <div
            className="venue-grid-home-preview assistant-venue-grid"
            style={{ '--home-venue-cols': gridCols } as CSSProperties}
          >
            {displayVenues.map(({ venue, reserveHref, availLabel }, i) => (
              <VenueCard
                key={`${venue.pitchId}-${i}`}
                venue={venue}
                stagger={i * 40}
                imageSizes="(max-width: 380px) 100vw, (max-width: 639px) 46vw, (max-width: 899px) 46vw, 22vw"
                reserveHref={reserveHref}
                availLabel={availLabel}
                pricePrefix=""
              />
            ))}
          </div>
        </section>
      )}

      <p className="muted-sm assistant-disclaimer">
        {isHome ? (
          <>
            با «رزرو» وارد همان پرداخت سانس‌چی می‌شوید.{' '}
            <a href="/assistant" className="assistant-full-link">
              نسخهٔ تمام‌صفحهٔ دستیار
            </a>
          </>
        ) : (
          <>
            دستیار رزرو نهایی ایجاد نمی‌کند؛ با «رزرو» وارد همان فرایند پرداخت سانس‌چی
            می‌شوید. تاریخ و ساعت بر اساس Asia/Tehran محاسبه می‌شود.
          </>
        )}
      </p>
    </div>
  );
}
