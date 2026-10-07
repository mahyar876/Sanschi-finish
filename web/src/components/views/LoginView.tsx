'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useState } from 'react';
import { apiFetch } from '@/lib/fetch-api';
import { setSession } from '@/lib/session';
import { numFa } from '@/lib/jalali';

type Tab = 'login' | 'register';

export function LoginView() {
  const router = useRouter();
  const search = useSearchParams();
  const redirect = search.get('redirect') || '/profile';

  const [tab, setTab] = useState<Tab>('login');
  const [method, setMethod] = useState<'phone' | 'email'>('phone');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regName, setRegName] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPass, setRegPass] = useState('');
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);

  async function sendOtp() {
    setErr('');
    if (!/^09[0-9]{9}$/.test(phone)) {
      setErr('شماره موبایل معتبر نیست');
      return;
    }
    setLoading(true);
    try {
      const data = await apiFetch<{ success: boolean; message?: string; dev_otp?: string }>(
        '/auth/send-otp',
        { method: 'POST', body: JSON.stringify({ phone }) },
      );
      if (!data.success) throw new Error(data.message);
      setOtpSent(true);
      if (data.dev_otp) console.info('OTP (dev):', data.dev_otp);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'خطا در ارسال کد');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch<{
        success: boolean;
        message?: string;
        token?: string;
        user?: { id: string; name: string; phone: string; email?: string; role: 'user' | 'admin' };
      }>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
      });
      if (!data.success || !data.token || !data.user) throw new Error(data.message);
      setSession(data.token, { ...data.user, id: data.user.id });
      router.push(redirect.startsWith('/') ? redirect : `/${redirect}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'کد نامعتبر است');
    } finally {
      setLoading(false);
    }
  }

  async function loginEmail() {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch<{
        success: boolean;
        message?: string;
        token?: string;
        user?: { id: string; name: string; phone: string; email?: string; role: 'user' | 'admin' };
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (!data.success || !data.token || !data.user) throw new Error(data.message);
      setSession(data.token, { ...data.user, id: data.user.id });
      router.push(redirect.startsWith('/') ? redirect : `/${redirect}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'ورود ناموفق');
    } finally {
      setLoading(false);
    }
  }

  async function register() {
    setLoading(true);
    setErr('');
    try {
      const data = await apiFetch<{
        success: boolean;
        message?: string;
        token?: string;
        user?: { id: string; name: string; phone: string; email?: string; role: 'user' | 'admin' };
      }>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          name: regName,
          phone: regPhone,
          email: regEmail || undefined,
          password: regPass || undefined,
        }),
      });
      if (!data.success || !data.token || !data.user) throw new Error(data.message);
      setSession(data.token, { ...data.user, id: data.user.id });
      router.push('/profile');
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'ثبت‌نام ناموفق');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-wrap">
      <header className="page-hero" style={{ border: 'none', paddingTop: '1rem' }}>
        <h1>ورود به سانس‌چی</h1>
        <p className="subtitle">برای رزرو و پیگیری سانس‌ها وارد حساب خود شوید</p>
      </header>
      <div className="auth-card">
        <div className="tabs">
          <button
            type="button"
            className={tab === 'login' ? 'tab active' : 'tab'}
            onClick={() => setTab('login')}
          >
            ورود
          </button>
          <button
            type="button"
            className={tab === 'register' ? 'tab active' : 'tab'}
            onClick={() => setTab('register')}
          >
            ثبت‌نام
          </button>
        </div>

        {tab === 'login' && (
          <>
            <div className="method-toggle">
              <button
                type="button"
                className={method === 'phone' ? 'active' : ''}
                onClick={() => setMethod('phone')}
              >
                موبایل
              </button>
              <button
                type="button"
                className={method === 'email' ? 'active' : ''}
                onClick={() => setMethod('email')}
              >
                ایمیل
              </button>
            </div>
            {method === 'phone' ? (
              <>
                <div className="field">
                  <label htmlFor="phone">شماره موبایل</label>
                  <input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="09123456789"
                    disabled={otpSent}
                  />
                </div>
                {otpSent && (
                  <div className="field">
                    <label htmlFor="otp">کد تأیید ({numFa(4)} رقم)</label>
                    <input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} />
                    <p className="form-msg" style={{ color: 'var(--text-muted)' }}>
                      در حالت توسعه، کد در ترمینال سرور چاپ می‌شود.
                    </p>
                  </div>
                )}
                {!otpSent ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={loading}
                    onClick={sendOtp}
                  >
                    دریافت کد
                  </button>
                ) : (
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    disabled={loading}
                    onClick={verifyOtp}
                  >
                    تأیید و ورود
                  </button>
                )}
              </>
            ) : (
              <>
                <div className="field">
                  <label htmlFor="email">ایمیل</label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </div>
                <div className="field">
                  <label htmlFor="password">رمز عبور</label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ width: '100%' }}
                  disabled={loading}
                  onClick={loginEmail}
                >
                  ورود
                </button>
              </>
            )}
          </>
        )}

        {tab === 'register' && (
          <>
            <div className="field">
              <label>نام</label>
              <input value={regName} onChange={(e) => setRegName(e.target.value)} />
            </div>
            <div className="field">
              <label>موبایل</label>
              <input value={regPhone} onChange={(e) => setRegPhone(e.target.value)} />
            </div>
            <div className="field">
              <label>ایمیل (اختیاری)</label>
              <input value={regEmail} onChange={(e) => setRegEmail(e.target.value)} />
            </div>
            <div className="field">
              <label>رمز (اختیاری، حداقل ۸ کاراکتر)</label>
              <input
                type="password"
                value={regPass}
                onChange={(e) => setRegPass(e.target.value)}
              />
            </div>
            <button
              type="button"
              className="btn btn-primary"
              style={{ width: '100%' }}
              disabled={loading}
              onClick={register}
            >
              ایجاد حساب
            </button>
          </>
        )}

        {err && <p className="form-msg err">{err}</p>}
      </div>
    </div>
  );
}
