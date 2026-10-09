import type { TehranZone } from '@/lib/tehran-zones';

export type VenueCategory = 'futsal' | 'grass' | 'volleyball' | 'multi';

export type Venue = {
  id: string;
  slug: string;
  name: string;
  category: VenueCategory;
  size: 5 | 7 | 11;
  priceFrom: number;
  availSlots: number;
  address: string;
  /** همیشه تهران — برای SEO و آدرس کامل */
  city: string;
  /** محدوده برای فیلتر گالری */
  zone: TehranZone;
  tags: string[];
  image: string;
  seoDescription: string;
  featured?: boolean;
  /** مختصات برای Google Maps */
  lat?: number;
  lng?: number;
};

export const CATEGORY_LABEL: Record<VenueCategory, string> = {
  futsal: 'سالن فوتسال',
  grass: 'چمن فوتبال',
  volleyball: 'سالن والیبال',
  multi: 'سالن چندمنظوره',
};

/** دادهٔ نمایشی — با API ادغام می‌شود وقتی بک‌اند در دسترس باشد */
export const VENUES: Venue[] = [
  {
    id: '1',
    slug: 'futsal-aria-tehran',
    name: 'سالن فوتسال آریا',
    category: 'futsal',
    size: 5,
    priceFrom: 480_000,
    availSlots: 6,
    address: 'ولیعصر، نرسیده به میدان ونک',
    city: 'تهران',
    zone: 'center',
    tags: ['سرپوشیده', 'کف PVC', 'رختکن', 'پارکینگ'],
    image: '/venues/venue-futsal-aria.jpg',
    seoDescription:
      'رزرو آنلاین سالن فوتسال ۵ نفره در تهران — سانس‌چی، رزرو سریع بدون تماس.',
    featured: true,
    lat: 35.7575,
    lng: 51.4103,
  },
  {
    id: '2',
    slug: 'volleyball-setare-east',
    name: 'سالن والیبال ستاره شرق',
    category: 'volleyball',
    size: 7,
    priceFrom: 420_000,
    availSlots: 5,
    address: 'نارمک، خیابان دماوند',
    city: 'تهران',
    zone: 'east',
    tags: ['تور استاندارد', 'سطح حرفه‌ای', 'وای‌فای'],
    image: '/venues/venue-volleyball-setare.jpg',
    seoDescription:
      'رزرو سالن والیبال در شرق تهران — مناسب تیم‌های آمateur و لیگ‌های محلی.',
    lat: 35.7312,
    lng: 51.5021,
  },
  {
    id: '3',
    slug: 'grass-mellat-11',
    name: 'چمن مصنوعی پارک ملت',
    category: 'grass',
    size: 11,
    priceFrom: 890_000,
    availSlots: 3,
    address: 'پارک ملت، بلوار کشاورز',
    city: 'تهران',
    zone: 'center',
    tags: ['چمن مصنوعی FIFA', 'روشنایی', 'تریبون'],
    image: '/venues/venue-grass-mellat.jpg',
    seoDescription:
      'رزرو چمن فوتبال ۱۱ نفره و فوتبال ساحلی در مرکز شهر — رزرو آنلاین سانس‌چی.',
    featured: true,
    lat: 35.7444,
    lng: 51.4152,
  },
  {
    id: '4',
    slug: 'grass-natural-rezaei-7',
    name: 'چمن طبیعی رضایی',
    category: 'grass',
    size: 7,
    priceFrom: 650_000,
    availSlots: 4,
    address: 'تهران‌پارس، خیابان شکوفه',
    city: 'تهران',
    zone: 'east',
    tags: ['چمن طبیعی', 'بوفه', 'رختکن'],
    image: '/venues/venue-grass-rezaei.jpg',
    seoDescription:
      'رزرو زمین چمن فوتبال ۷ نفره با چمن طبیعی — مناسب تمرین و بازی دوستانه.',
    lat: 35.7398,
    lng: 51.5488,
  },
  {
    id: '5',
    slug: 'multi-omid-futsal-volleyball',
    name: 'سالن چندمنظوره امید',
    category: 'multi',
    size: 5,
    priceFrom: 450_000,
    availSlots: 8,
    address: 'صادقیه، خیابان آیت‌الله کاشانی',
    city: 'تهران',
    zone: 'west',
    tags: ['فوتسال', 'والیبال', 'رختکن', 'دوش'],
    image: '/venues/venue-multi-omid.jpg',
    seoDescription:
      'رزرو سالن ورزشی چندمنظوره فوتسال و والیبال — یک فضا، دو رشته.',
    lat: 35.7241,
    lng: 51.3345,
  },
  {
    id: '6',
    slug: 'grass-university-night',
    name: 'چمن دانشگاه (شب)',
    category: 'grass',
    size: 11,
    priceFrom: 820_000,
    availSlots: 2,
    address: 'انقلاب، محوطه دانشگاه تهران',
    city: 'تهران',
    zone: 'center',
    tags: ['نورافکن', 'چمن مصنوعی', 'دوربین'],
    image: '/venues/venue-grass-university.jpg',
    seoDescription:
      'رزرو چمن فوتبال با روشنایی شبانه — سانس عصر و شب برای تیم‌ها.',
    lat: 35.7033,
    lng: 51.3956,
  },
  {
    id: '7',
    slug: 'futsal-shargh-7',
    name: 'فوتسال ستاره شرق',
    category: 'futsal',
    size: 7,
    priceFrom: 520_000,
    availSlots: 7,
    address: 'پیروزی، خیابان نیروی هوایی',
    city: 'تهران',
    zone: 'east',
    tags: ['۷ نفره', 'سرپوشیده', 'نوشیدنی'],
    image: '/venues/venue-futsal-shargh.jpg',
    seoDescription:
      'رزرو سالن فوتسال ۷ نفره در شرق تهران — سانس‌های خالی امروز را ببینید.',
    lat: 35.6992,
    lng: 51.4891,
  },
  {
    id: '8',
    slug: 'volleyball-north-tehran',
    name: 'سالن والیبال شمال',
    category: 'volleyball',
    size: 7,
    priceFrom: 400_000,
    availSlots: 6,
    address: 'تجریش، خیابان دربند',
    city: 'تهران',
    zone: 'north',
    tags: ['سالن اختصاصی والیبال', 'سطح A', 'رختکن'],
    image: '/venues/venue-volleyball-north.jpg',
    seoDescription:
      'رزرو سالن والیبال در شمال تهران — مناسب تمرین تیم و مسابقات دوستانه.',
    lat: 35.8042,
    lng: 51.4258,
  },
  {
    id: '9',
    slug: 'grass-natural-shomal-7',
    name: 'چمن ۷ نفره شمائل',
    category: 'grass',
    size: 7,
    priceFrom: 580_000,
    availSlots: 5,
    address: 'شمیرانات، لواسان',
    city: 'تهران',
    zone: 'north',
    tags: ['چمن طبیعی', 'هوای تمیز', 'پارکینگ'],
    image: '/venues/venue-grass-natural.jpg',
    seoDescription:
      'رزرو چمن فوتبال در لواسان — فضای باز و چمن طبیعی برای آخر هفته.',
    lat: 35.8224,
    lng: 51.6342,
  },
];
