import { apiUrl } from './api';
import { getToken } from './session';

export class ApiError extends Error {
  constructor(
    message: string,
    public status?: number,
  ) {
    super(message);
  }
}

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(apiUrl(path), { ...init, headers });
  } catch {
    throw new ApiError('اتصال به سرور برقرار نشد');
  }

  const text = await res.text();
  if (res.status === 429) {
    throw new ApiError(
      'درخواست‌های زیاد؛ لطفاً چند دقیقه صبر کنید و دوباره تلاش کنید',
      429,
    );
  }
  let data: T;
  try {
    data = (text ? JSON.parse(text) : {}) as T;
  } catch {
    throw new ApiError(
      res.ok ? 'پاسخ نامعتبر از سرور' : res.status ? `خطای سرور (${res.status})` : 'اتصال به سرور برقرار نشد',
      res.status,
    );
  }

  if (!res.ok) {
    const msg =
      (data as { message?: string })?.message ||
      `خطای سرور (${res.status})`;
    throw new ApiError(msg, res.status);
  }

  return data;
}
