/** خطوط متن را به لیست بند تبدیل می‌کند (خط خالی حذف) */
export function textToBulletLines(text: string | undefined | null): string[] {
  if (!text?.trim()) return [];
  return text
    .split(/\r?\n/)
    .map((l) => l.replace(/^[\s•\-–—]+/, '').trim())
    .filter(Boolean);
}
