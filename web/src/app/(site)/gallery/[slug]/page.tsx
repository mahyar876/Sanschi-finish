import type { Metadata } from 'next';
import { VENUES } from '@/data/venues';
import { VenueDetailView } from '@/components/views/VenueDetailView';

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return VENUES.map((v) => ({ slug: v.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const venue = VENUES.find((v) => v.slug === slug);
  if (!venue) return { title: 'مجموعه' };
  return {
    title: venue.name,
    description: venue.seoDescription,
  };
}

export default async function VenueDetailPage({ params }: Props) {
  const { slug } = await params;
  return <VenueDetailView slug={slug} />;
}
