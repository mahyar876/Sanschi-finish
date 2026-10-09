const MERCHANT_ID = process.env.ZARINPAL_MERCHANT_ID || '';
const SANDBOX = String(process.env.ZARINPAL_SANDBOX || 'true') === 'true';
const CURRENCY = (process.env.ZARINPAL_CURRENCY || 'rial').toLowerCase();

const ZP_BASE = SANDBOX
  ? 'https://sandbox.zarinpal.com'
  : 'https://api.zarinpal.com';

function toGatewayAmount(toman) {
  return CURRENCY === 'toman' ? toman : toman * 10;
}

function fromGatewayAmount(gateway) {
  return CURRENCY === 'toman' ? gateway : Math.round(gateway / 10);
}

async function verifyPayment(authority, gatewayAmount) {
  const res = await fetch(`${ZP_BASE}/pg/v4/payment/verify.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      merchant_id: MERCHANT_ID,
      amount: gatewayAmount,
      authority,
    }),
  });
  const data = await res.json();
  return data;
}

/** استعلام وضعیت — همان verify با authority */
async function inquiryByAuthority(authority, gatewayAmount) {
  return verifyPayment(authority, gatewayAmount);
}

/**
 * بازپرداخت زرین‌پال v4 (نیاز به ref_id از verify)
 * https://docs.zarinpal.com/paymentGateway/refund
 */
async function refundPayment(refId, gatewayAmount, description = 'بازپرداخت رزرو سانس‌چی') {
  if (!MERCHANT_ID) {
    throw new Error('ZARINPAL_MERCHANT_ID تنظیم نشده');
  }
  const res = await fetch(`${ZP_BASE}/pg/v4/payment/refund.json`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      merchant_id: MERCHANT_ID,
      session_id: refId,
      amount: gatewayAmount,
      description,
    }),
  });
  const data = await res.json();
  const ok =
    data.data &&
    (data.data.code === 100 || data.data.code === 101 || data.data.code === 1);
  if (!ok) {
    const msg =
      (data.errors && (data.errors.message || JSON.stringify(data.errors))) ||
      'بازپرداخت درگاه ناموفق بود';
    throw new Error(msg);
  }
  return data.data;
}

module.exports = {
  MERCHANT_ID,
  toGatewayAmount,
  fromGatewayAmount,
  verifyPayment,
  inquiryByAuthority,
  refundPayment,
};
