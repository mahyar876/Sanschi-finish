'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch, ApiError } from '@/lib/fetch-api';
import {
  DEMO_OTP,
  demoLoginAs,
  demoRegisterUser,
  isDemoFrontend,
  showDevQuickLogin,
  SITE_OWNER_PHONE,
} from '@/lib/demo';
import { pathAfterAuth } from '@/lib/account-home';
import { applyPendingFavoriteAfterLogin } from '@/lib/favorites';
import { setSession, type SessionUser } from '@/lib/session';
import { numFa } from '@/lib/jalali';

type Tab = 'login' | 'register';

export function LoginView() {
  const router = useRouter();
  const search = useSearchParams();
  const redirectParam = search.get('redirect');
  const tabParam = search.get('tab');

  const [tab, setTab] = useState<Tab>(() =>
    tabParam === 'register' ? 'register' : 'login',
  );

  useEffect(() => {
    if (tabParam === 'register') setTab('register');
    else if (tabParam === 'login') setTab('login');
  }, [tabParam]);
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
  const [otpDevHint, setOtpDevHint] = useState('');
  const [loading, setLoading] = useState(false);

  async function goAfterAuth() {
    await applyPendingFavoriteAfterLogin();
    router.push(pathAfterAuth(redirectParam));
  }

  async function sendOtp() {
    setErr('');
    setOtpDevHint('');
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
      const hintCode = data.dev_otp || DEMO_OTP;
      setOtpDevHint(`کد ورود: ${hintCode}`);
      if (hintCode.length === 6) setOtp(hintCode);
    } catch (e) {
      if (isDemoFrontend()) {
        setOtpSent(true);
        setErr('');
        return;
      }
      setErr(e instanceof ApiError ? e.message : 'خطا در ارسال کد');
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
        user?: SessionUser & { id: string };
      }>('/auth/verify-otp', {
        method: 'POST',
        body: JSON.stringify({ phone, otp }),
      });
      if (!data.success || !data.token || !data.user) throw new Error(data.message);
      const user: SessionUser = { ...data.user, id: data.user.id };
      setSession(data.token, user);
      goAfterAuth();
    } catch (e) {
      if (isDemoFrontend() && otp.trim() === DEMO_OTP) {
        const isSiteOwner = phone === SITE_OWNER_PHONE;
        demoLoginAs(
          isSiteOwner ? 'admin' : 'user',
          isSiteOwner ? 'مدیر سانس‌چی' : 'کاربر نمایشی',
          phone,
        );
        goAfterAuth();
        return;
      }
      setErr(e instanceof ApiError ? e.message : 'کد نامعتبر است');
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
        user?: SessionUser & { id: string };
      }>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (!data.success || !data.token || !data.user) throw new Error(data.message);
      const user: SessionUser = { ...data.user, id: data.user.id };
      setSession(data.token, user);
      goAfterAuth();
    } catch (e) {
      if (isDemoFrontend() && email && password.length >= 4) {
        demoLoginAs('user', email.split('@')[0] || 'کاربر', '09120000000');
        goAfterAuth();
        return;
      }
      setErr(e instanceof ApiError ? e.message : 'ورود ناموفق');
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
        user?: SessionUser & { id: string };
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
      const user: SessionUser = { ...data.user, id: data.user.id };
      setSession(data.token, user);
      goAfterAuth();
    } catch (e) {
      if (isDemoFrontend() && regName.trim().length >= 2 && /^09[0-9]{9}$/.test(regPhone)) {
        demoRegisterUser({
          name: regName.trim(),
          phone: regPhone,
          email: regEmail || undefined,
        });
        goAfterAuth();
        return;
      }
      setErr(e instanceof ApiError ? e.message : 'ثبت‌نام ناموفق');
    } finally {
      setLoading(false);
    }
  }

  function quickDemo(role: 'user' | 'admin' | 'owner') {
    demoLoginAs(role, role === 'admin' ? 'مدیر سانس‌چی' : undefined);
    const dest =
      role === 'admin' ? '/admin' : role === 'owner' ? '/owner' : pathAfterAuth(redirectParam);
    router.push(dest);
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
                    <label htmlFor="otp">کد تأیید ({numFa(6)} رقم)</label>
                    <input id="otp" value={otp} onChange={(e) => setOtp(e.target.value)} />
                    {otpDevHint ? (
                      <p className="form-msg" style={{ color: 'var(--accent)' }}>
                        {otpDevHint}
                      </p>
                    ) : (
                      <p className="form-msg" style={{ color: 'var(--text-muted)' }}>
                        {otpDevHint ||
                          (isDemoFrontend()
                            ? `کد ${DEMO_OTP}`
                            : `کد موقت: ${DEMO_OTP}`)}
                      </p>
                    )}
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

        {showDevQuickLogin() && (
          <div className="demo-quick-login">
            <p>
              {isDemoFrontend()
                ? 'ورود سریع (بدون سرور)'
                : 'ورود سریع نمایشی (لوکال — برای باز کردن چند پنل: /dev/panels)'}
            </p>
            <div className="hero-actions">
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => quickDemo('user')}
              >
                ورود بازیکن
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => quickDemo('admin')}
              >
                ورود ادمین
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => quickDemo('owner')}
              >
                ورود مالک زمین
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
