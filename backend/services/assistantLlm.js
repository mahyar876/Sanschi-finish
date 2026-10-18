/**
 * لایه اختیاری مدل زبانی — بدون کلید API فقط null برمی‌گرداند (مسیر قواعد فعال می‌ماند).
 * ASSISTANT_LLM_URL + ASSISTANT_LLM_API_KEY (فقط سرور)
 */

async function extractWithLlm(_message, _context) {
  const url = process.env.ASSISTANT_LLM_URL;
  const key = process.env.ASSISTANT_LLM_API_KEY;
  if (!url || !key) return null;

  const timeoutMs = parseInt(process.env.ASSISTANT_LLM_TIMEOUT_MS || '12000', 10);
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        message: String(_message).slice(0, 1500),
        context: _context,
      }),
      signal: controller.signal,
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!data || typeof data !== 'object') return null;
    return data;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

module.exports = { extractWithLlm };
