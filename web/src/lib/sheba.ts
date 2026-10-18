const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';

export function normalizeSheba(input: string): string {
  let s = input.replace(/\s/g, '').toUpperCase();
  s = s.replace(/[۰-۹]/g, (c) => String(FA_DIGITS.indexOf(c)));
  const digits = s.replace(/^IR/i, '').replace(/\D/g, '');
  if (digits.length !== 24) return s;
  return `IR${digits}`;
}

export function isValidSheba(input: string): boolean {
  const s = normalizeSheba(input);
  return /^IR[0-9]{24}$/.test(s);
}

export function formatShebaDisplay(input: string): string {
  const s = normalizeSheba(input);
  if (!/^IR[0-9]{24}$/.test(s)) return input;
  const d = s.slice(2);
  return `IR ${d.replace(/(.{4})/g, '$1 ').trim()}`;
}
