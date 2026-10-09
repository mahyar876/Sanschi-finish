'use client';

import Image, { type ImageProps } from 'next/image';
import { useEffect, useState } from 'react';
import type { VenueCategory } from '@/data/venues';
import {
  fallbackImageForCategory,
  isUsablePitchImage,
  pitchImageNeedsUnoptimized,
} from '@/lib/venue-images';

type Props = Omit<ImageProps, 'src'> & {
  src: string;
  /** اگر src خراب بود، placeholder همین نوع نشان داده می‌شود */
  category?: VenueCategory;
};

function initialSrc(src: string, category?: VenueCategory): string {
  if (isUsablePitchImage(src)) return src.trim();
  return fallbackImageForCategory(category);
}

/** تصویر مجموعه — SVG و data URL بدون بهینه‌سازی Next؛ fallback روی خطا */
export function VenueImage({ src, category, alt, onError, ...rest }: Props) {
  const [current, setCurrent] = useState(() => initialSrc(src, category));

  useEffect(() => {
    setCurrent(initialSrc(src, category));
  }, [src, category]);

  return (
    <Image
      src={current}
      alt={alt}
      unoptimized={pitchImageNeedsUnoptimized(current)}
      onError={(e) => {
        onError?.(e);
        const fb = fallbackImageForCategory(category);
        if (current !== fb) setCurrent(fb);
      }}
      {...rest}
    />
  );
}
