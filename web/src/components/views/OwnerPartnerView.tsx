'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Button } from '@/components/Button';
import {
  fetchMyOwnerApplication,
  submitOwnerApplication,
} from '@/lib/owner-applications';
import { TEHRAN_ZONE_LABEL, TEHRAN_ZONE_ORDER, type TehranZone } from '@/lib/tehran-zones';
import { getUser } from '@/lib/session';
import { pitchSizeLabel, priceFa } from '@/lib/format';
import { isValidSheba, normalizeSheba } from '@/lib/sheba';
import { WomenBookingSelect } from '@/components/form/WomenBookingSelect';

export function OwnerPartnerView() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sheba, setSheba] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');

  const [revisionHint, setRevisionHint] = useState('');

  useEffect(() => {
    const session = getUser();
    if (session?.name) {
      const parts = session.name.trim().split(/\s+/);
      setFirstName(parts[0] || '');
      setLastName(parts.slice(1).join(' ') || '');
    }
    if (session?.phone) setPhone(session.phone);
    if (session?.email) setEmail(session.email);

    if (!session?.phone) return;
    void fetchMyOwnerApplication().then((app) => {
      if (!app || app.status !== 'needs_revision') return;
      setRevisionHint(app.revisionNote || '');
      setFirstName(app.firstName || app.contactName.split(/\s+/)[0] || '');
      setLastName(app.lastName || app.contactName.split(/\s+/).slice(1).join(' ') || '');
      if (app.sheba) setSheba(app.sheba);
      setPhone(app.phone);
      if (app.email) setEmail(app.email);
      setVenueName(app.venueName);
      setVenueType(app.venueType);
      setSize(app.size);
      setAddress(app.address);
      if (app.tehranZone) setTehranZone(app.tehranZone as TehranZone);
      setBasePriceText(String(app.basePrice));
      if (app.description) setDescription(app.description);
      if (app.womenBookingAllowed === true || app.womenBookingAllowed === false) {
        setWomenBookingAllowed(app.womenBookingAllowed);
      }
    });
  }, []);
  const [venueName, setVenueName] = useState('');
  const [venueType, setVenueType] = useState<'futsal' | 'grass'>('futsal');
  const [size, setSize] = useState<5 | 7 | 11>(5);
  const [address, setAddress] = useState('');
  const [tehranZone, setTehranZone] = useState<TehranZone | ''>('center');
  const [basePriceText, setBasePriceText] = useState('550000');
  const [description, setDescription] = useState('');
  const [womenBookingAllowed, setWomenBookingAllowed] = useState<boolean | null>(null);
  const [err, setErr] = useState('');
  const [done, setDone] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr('');
    setDone('');
    setLoading(true);
    const basePrice = parseInt(basePriceText.replace(/\D/g, ''), 10);
    if (!Number.isFinite(basePrice) || basePrice < 100_000) {
      setErr('قیمت پایه هر سانس باید حداقل ۱۰۰٬۰۰۰ تومان باشد.');
      setLoading(false);
      return;
    }
    if (firstName.trim().length < 2 || lastName.trim().length < 2) {
      setErr('نام و نام خانوادگی را کامل وارد کنید.');
      setLoading(false);
      return;
    }
    if (!isValidSheba(sheba)) {
      setErr('شماره شبا معتبر نیست — IR به‌علاوه ۲۴ رقم.');
      setLoading(false);
      return;
    }
    if (womenBookingAllowed !== true && womenBookingAllowed !== false) {
      setErr('لطفاً مشخص کنید آیا رزرو برای بانوان در زمین شما مجاز است یا خیر.');
      setLoading(false);
      return;
    }
    try {
      const { message } = await submitOwnerApplication({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        contactName: `${firstName.trim()} ${lastName.trim()}`,
        sheba: normalizeSheba(sheba),
        phone: phone.trim(),
        email: email.trim() || undefined,
        venueName: venueName.trim(),
        venueType,
        size,
        address: address.trim(),
        tehranZone: tehranZone || undefined,
        basePrice,
        womenBookingAllowed,
        description: description.trim() || undefined,
      });
      setDone(message);
    } catch (ex) {
      setErr(ex instanceof Error ? ex.message : 'ثبت درخواست ناموفق بود');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    const loggedIn = !!getUser();
    return (
      <div className="page page-narrow">
        <h1>درخواست ثبت شد</h1>
        <p className="subtitle">{done}</p>
        <p className="prose">
          {loggedIn
            ? 'نتیجه بررسی (تأیید، اصلاح یا رد) در پنل بازیکن → اعلان‌ها و صفحه اصلی پنل به شما نشان داده می‌شود.'
            : 'پس از بررسی، با همان شماره موبایل وارد شوید تا اعلان و در صورت تأیید، پنل صاحب زمین برایتان فعال شود.'}
        </p>
        <div className="hero-actions">
          {loggedIn ? (
            <>
              <Button href="/player/notifications" variant="primary">
                اعلان‌ها
              </Button>
              <Button href="/player" variant="secondary">
                پنل من
              </Button>
            </>
          ) : (
            <>
              <Button href="/login" variant="primary">
                ورود / ثبت‌نام
              </Button>
              <Button href="/" variant="secondary">
                بازگشت به خانه
              </Button>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="page page-narrow partner-page">
      <header className="page-hero">
        <p className="eyebrow">همکاری با سانس‌چی</p>
        <h1>زمین یا سالن خود را ثبت کنید</h1>
        <p className="subtitle">
          فرم زیر را پر کنید. پس از اعتبارسنجی در پنل مدیر، مجموعه شما فعال می‌شود و
          می‌توانید به‌عنوان مالک رزروها را مدیریت کنید.
        </p>
      </header>

      {revisionHint && (
        <div className="panel dash-alert dash-alert-warn" role="status">
          <strong>اصلاح درخواست قبلی</strong>
          <p className="partner-detail-multiline" style={{ margin: '0.5rem 0 0' }}>
            {revisionHint}
          </p>
          <p className="muted-sm" style={{ marginTop: '0.5rem' }}>
            فرم زیر با اطلاعات قبلی پر شده — اصلاح کنید و دوباره ارسال کنید.
          </p>
        </div>
      )}

      <form className="panel partner-form" onSubmit={onSubmit}>
        <h2>اطلاعات تماس و تسویه</h2>
        <div className="field-row">
          <div className="field">
            <label htmlFor="partner-first">نام</label>
            <input
              id="partner-first"
              required
              minLength={2}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="partner-last">نام خانوادگی</label>
            <input
              id="partner-last"
              required
              minLength={2}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>
        <div className="field">
          <label htmlFor="partner-sheba">شماره شبا (برای واریز درآمد)</label>
          <input
            id="partner-sheba"
            required
            dir="ltr"
            className="input-ltr"
            value={sheba}
            onChange={(e) => setSheba(e.target.value)}
            placeholder="IR120170000000000000000000"
          />
          <p className="muted-sm">شماره شبای همان صاحب حساب — ۲۶ کاراکتر با IR</p>
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="partner-phone">موبایل (همان حساب ورود)</label>
            <input
              id="partner-phone"
              required
              pattern="09[0-9]{9}"
              inputMode="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="09121234567"
            />
          </div>
          <div className="field">
            <label htmlFor="partner-email">ایمیل (اختیاری)</label>
            <input
              id="partner-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <h2>مشخصات مجموعه</h2>
        <div className="field">
          <label htmlFor="partner-venue">نام مجموعه</label>
          <input
            id="partner-venue"
            required
            value={venueName}
            onChange={(e) => setVenueName(e.target.value)}
            placeholder="مثلاً سالن فوتسال آریا"
          />
        </div>
        <div className="field-row">
          <div className="field">
            <label htmlFor="partner-type">نوع</label>
            <select
              id="partner-type"
              value={venueType}
              onChange={(e) => setVenueType(e.target.value as 'futsal' | 'grass')}
            >
              <option value="futsal">سالن / فوتسال</option>
              <option value="grass">زمین چمن</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="partner-size">ابعاد زمین (متر)</label>
            <select
              id="partner-size"
              value={size}
              onChange={(e) => setSize(Number(e.target.value) as 5 | 7 | 11)}
            >
              <option value={5}>{pitchSizeLabel(5)}</option>
              <option value={7}>{pitchSizeLabel(7)}</option>
              <option value={11}>{pitchSizeLabel(11)}</option>
            </select>
          </div>
        </div>
        <div className="field">
          <label htmlFor="partner-zone">محدوده تهران</label>
          <select
            id="partner-zone"
            value={tehranZone}
            onChange={(e) => setTehranZone(e.target.value as TehranZone)}
          >
            {TEHRAN_ZONE_ORDER.map((z) => (
              <option key={z} value={z}>
                {TEHRAN_ZONE_LABEL[z]}
              </option>
            ))}
          </select>
        </div>
        <div className="field">
          <label htmlFor="partner-address">آدرس دقیق</label>
          <textarea
            id="partner-address"
            required
            rows={2}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="محله، خیابان، پلاک…"
          />
        </div>
        <div className="field">
          <label htmlFor="partner-price">قیمت پایه هر سانس (تومان)</label>
          <input
            id="partner-price"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required
            value={basePriceText}
            onChange={(e) => setBasePriceText(e.target.value.replace(/\D/g, ''))}
            placeholder="550000"
          />
          <p className="muted-sm">
            نمایش فعلی:{' '}
            {priceFa(parseInt(basePriceText, 10) || 0)} تومان
          </p>
        </div>
        <WomenBookingSelect
          id="partner-women-booking"
          value={womenBookingAllowed}
          onChange={setWomenBookingAllowed}
          requireChoice
          hint="در گالری و صفحه رزرو برای بازیکنان نمایش داده می‌شود؛ بعداً در پنل مالک هم قابل تغییر است."
        />
        <div className="field">
          <label htmlFor="partner-desc">توضیحات (اختیاری)</label>
          <textarea
            id="partner-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="امکانات، ساعات کاری، پارکینگ…"
          />
        </div>

        {err && <p className="form-error">{err}</p>}

        <div className="hero-actions">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'در حال ارسال…' : 'ارسال برای بررسی'}
          </button>
          <Link href="/reserve" className="btn btn-ghost">
            رفتن به رزرو
          </Link>
        </div>
      </form>
    </div>
  );
}
