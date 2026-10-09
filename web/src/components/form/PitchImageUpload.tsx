'use client';

import { useRef } from 'react';

type Props = {
  image?: string;
  onImageChange: (dataUrlOrUrl: string) => void;
  maxMb?: number;
  onError?: (msg: string) => void;
};

export function PitchImageUpload({ image, onImageChange, maxMb = 4, onError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);

  function onFile(file: File | null) {
    if (!file) return;
    if (file.size > maxMb * 1024 * 1024) {
      onError?.(`حجم عکس حداکثر ${maxMb} مگابایت`);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => onImageChange(String(reader.result));
    reader.readAsDataURL(file);
  }

  return (
    <div className="pitch-image-upload-block">
      <label className="pitch-thumb-upload wide">
        {image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="پیش‌نمایش عکس زمین" />
        ) : (
          <span className="pitch-upload-placeholder">
            <span className="pitch-upload-icon" aria-hidden>
              📷
            </span>
            هنوز عکسی انتخاب نشده
          </span>
        )}
      </label>
      <div className="pitch-upload-actions">
        <button type="button" className="btn btn-primary btn-sm" onClick={() => inputRef.current?.click()}>
          {image ? 'تعویض عکس' : 'آپلود عکس از دستگاه'}
        </button>
        {image && (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onImageChange('')}>
            حذف عکس
          </button>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        hidden
        onChange={(e) => {
          onFile(e.target.files?.[0] || null);
          e.target.value = '';
        }}
      />
      <p className="muted-sm">فرمت JPG یا PNG — حداکثر {maxMb} مگابایت. پس از انتخاب، «ذخیره» را بزنید.</p>
    </div>
  );
}
