'use client';

import { useEffect, useState } from 'react';
import { fetchPublicSiteSettings } from '@/lib/site-settings';

const DEFAULT_EMAIL = 'support@sanschii.ir';

export function FooterContact() {
  const [email, setEmail] = useState(DEFAULT_EMAIL);
  const [phoneDisplay, setPhoneDisplay] = useState('');
  const [phoneTel, setPhoneTel] = useState('');

  useEffect(() => {
    void fetchPublicSiteSettings().then((s) => {
      if (s.supportEmail) setEmail(s.supportEmail);
      const disp = s.supportPhoneDisplay || s.supportPhone || '';
      setPhoneDisplay(disp);
      setPhoneTel(s.supportPhone || '');
    });
  }, []);

  return (
    <p className="footer-contact muted-sm">
      پشتیبانی: <a href={`mailto:${email}`}>{email}</a>
      {phoneDisplay ? (
        <>
          {' · '}
          <a href={phoneTel ? `tel:${phoneTel}` : undefined}>{phoneDisplay}</a>
        </>
      ) : null}
      {' · '}
      <a href="/player/support">تیکت پشتیبانی</a>
    </p>
  );
}
