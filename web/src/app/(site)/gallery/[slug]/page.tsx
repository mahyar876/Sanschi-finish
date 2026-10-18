import { redirect } from 'next/navigation';

type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** مسیر قدیمی جزئیات مجموعه — مستقیم به رزرو */
export default async function GalleryVenueRedirect({ params, searchParams }: Props) {
  const { slug } = await params;
  const sp = await searchParams;
  const raw = sp.pitchId;
  const pitchId =
    typeof raw === 'string' ? raw : Array.isArray(raw) ? raw[0] : undefined;

  const q = new URLSearchParams({ venue: slug });
  if (pitchId) q.set('pitchId', pitchId);
  redirect(`/reserve?${q.toString()}`);
}
