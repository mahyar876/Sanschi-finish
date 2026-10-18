/**
 * ارسال SMS — Kavenegar یا حالت stub
 * SMS_ENABLED=true
 * SMS_PROVIDER=kavenegar
 * KAVENEGAR_API_KEY=...
 * KAVENEGAR_SENDER=10008663
 */
async function sendSms(phone, text) {
  if (!phone || !text) return { sent: false };
  if (process.env.SMS_ENABLED !== 'true') {
    console.log(`[SMS stub → ${phone}] (${text.length} chars, content redacted)`);
    return { sent: false, stub: true };
  }

  const provider = (process.env.SMS_PROVIDER || 'kavenegar').toLowerCase();
  if (provider === 'kavenegar') {
    const key = process.env.KAVENEGAR_API_KEY;
    const sender = process.env.KAVENEGAR_SENDER || '';
    if (!key) {
      console.error('KAVENEGAR_API_KEY missing');
      return { sent: false };
    }
    const url = `https://api.kavenegar.com/v1/${key}/sms/send.json`;
    const body = new URLSearchParams({
      receptor: phone,
      message: text,
    });
    if (sender) body.set('sender', sender);
    const res = await fetch(url, { method: 'POST', body });
    const data = await res.json();
    const ok = data.return?.status === 200;
    if (!ok) console.error('Kavenegar error:', JSON.stringify(data));
    return { sent: ok, provider: 'kavenegar' };
  }

  console.log(`[SMS unknown provider ${provider}] ${phone}: ${text}`);
  return { sent: false };
}

module.exports = { sendSms };
