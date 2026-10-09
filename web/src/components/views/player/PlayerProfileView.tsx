'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ActionsPanel, PageIntro, StatGrid, StatCard } from '@/components/dashboard/DashboardPageBlocks';
import { PartnerApplicationStatusBanner } from '@/components/PartnerApplicationStatusBanner';
import { apiFetch } from '@/lib/fetch-api';
import { isDemoFrontend } from '@/lib/demo';
import { getToken, getUser, setSession, type SessionUser } from '@/lib/session';

export function PlayerProfileView() {
  const pathname = usePathname();
  const inOwnerPanel = pathname.startsWith('/owner');
  const inAdminPanel = pathname.startsWith('/admin');

  const [user, setUser] = useState<SessionUser | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    async function load() {
      const cached = getUser();
      if (!cached) return;
      let u = cached;
      const token = getToken();
      if (token && !token.startsWith('demo-token') && !isDemoFrontend()) {
        try {
          const data = await apiFetch<{ success: boolean; user: SessionUser & { id: string } }>(
            '/auth/me',
          );
          if (data.user) {
            u = { ...data.user, id: data.user.id };
            setSession(token, u);
          }
        } catch {
          /* همان cache */
        }
      }
      setUser(u);
      setName(u.name);
      setEmail(u.email || '');
    }
    void load();
  }, []);

  async function saveProfile() {
    setMsg('');
    if (isDemoFrontend()) {
      const u = getUser();
      const token = getToken();
      if (u && token) {
        const next = { ...u, name: name.trim() || u.name, email: email || undefined };
        setSession(token, next);
        setUser(next);
        setMsg('ذخیره شد');
      }
      return;
    }
    try {
      const data = await apiFetch<{ success: boolean; user: SessionUser; message?: string }>(
        '/auth/me',
        { method: 'PATCH', body: JSON.stringify({ name, email: email || null }) },
      );
      if (!data.success) throw new Error(data.message);
      setUser(data.user);
      setMsg('ذخیره شد');
    } catch (e) {
      setMsg(e instanceof Error ? e.message : 'خطا');
    }
  }

  return (
    <>
      <PageIntro
        title="پروفایل و تنظیمات"
        description={
          inOwnerPanel
            ? 'اطلاعات حساب صاحب زمین.'
            : inAdminPanel
              ? 'اطلاعات حساب مدیر.'
              : 'اطلاعات حساب و میانبر به پنل‌های دیگر در صورت نیاز.'
        }
      />
      {!inOwnerPanel && <PartnerApplicationStatusBanner user={user} />}
      <StatGrid>
        <StatCard label="نام" value={user?.name || '—'} />
        <StatCard label="موبایل" value={user?.phone || '—'} />
      </StatGrid>
      <ActionsPanel title="ویرایش">
        <div className="field">
          <label>نام</label>
          <input value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label>ایمیل</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <button type="button" className="btn btn-primary btn-sm" onClick={saveProfile}>
          ذخیره
        </button>
        {msg && <p className="form-msg ok">{msg}</p>}
      </ActionsPanel>
      {user?.role === 'owner' && inOwnerPanel && (
        <ActionsPanel title="رزرو شخصی">
          <p className="muted-sm" style={{ marginTop: 0 }}>
            برای رزرو زمین دیگران (نه مدیریت مجموعه خودتان).
          </p>
          <Link href="/player/reservations" className="btn btn-secondary btn-sm">
            رزروهای من به‌عنوان بازیکن
          </Link>
        </ActionsPanel>
      )}
      {user?.role === 'owner' && !inOwnerPanel && (
        <ActionsPanel title="پنل‌های دیگر">
          <Link href="/owner" className="btn btn-secondary btn-sm">
            پنل صاحب زمین
          </Link>
        </ActionsPanel>
      )}
      {user?.role === 'admin' && !inAdminPanel && (
        <ActionsPanel title="پنل‌های دیگر">
          <Link href="/admin" className="btn btn-secondary btn-sm">
            پنل مدیر
          </Link>
        </ActionsPanel>
      )}
    </>
  );
}
