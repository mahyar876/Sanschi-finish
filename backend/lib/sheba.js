/** شبا ایران — IR + ۲۴ رقم */

function normalizeSheba(input) {
  if (!input) return '';
  let s = String(input).replace(/\s/g, '').toUpperCase();
  s = s.replace(/[۰-۹]/g, (c) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(c)));
  const digits = s.replace(/^IR/i, '').replace(/\D/g, '');
  if (digits.length !== 24) return s;
  return `IR${digits}`;
}

function isValidSheba(input) {
  const s = normalizeSheba(input);
  return /^IR[0-9]{24}$/.test(s);
}

module.exports = { normalizeSheba, isValidSheba };
