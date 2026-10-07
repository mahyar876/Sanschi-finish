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
  city: string;
  tags: string[];
  image: string;
  seoDescription: string;
  featured?: boolean;
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
    tags: ['سرپوشیده', 'کف PVC', 'رختکن', 'پارکینگ'],
    image: '/venues/venue-futsal-aria.jpg',
    seoDescription:
      'رزرو آنلاین سالن فوتسال ۵ نفره در تهران — سانس‌چی، رزرو سریع بدون تماس.',
    featured: true,
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
    tags: ['تور استاندارد', 'سطح حرفه‌ای', 'وای‌فای'],
    image: '/venues/venue-volleyball-setare.jpg',
    seoDescription:
      'رزرو سالن والیبال در شرق تهران — مناسب تیم‌های آمateur و لیگ‌های محلی.',
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
    tags: ['چمن مصنوعی FIFA', 'روشنایی', 'تریبون'],
    image: '/venues/venue-grass-mellat.jpg',
    seoDescription:
      'رزرو چمن فوتبال ۱۱ نفره و فوتبال ساحلی در مرکز شهر — رزرو آنلاین سانس‌چی.',
    featured: true,
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
    tags: ['چمن طبیعی', 'بوفه', 'رختکن'],
    image: '/venues/venue-grass-rezaei.jpg',
    seoDescription:
      'رزرو زمین چمن فوتبال ۷ نفره با چمن طبیعی — مناسب تمرین و بازی دوستانه.',
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
    tags: ['فوتسال', 'والیبال', 'رختکن', 'دوش'],
    image: '/venues/venue-multi-omid.jpg',
    seoDescription:
      'رزرو سالن ورزشی چندمنظوره فوتسال و والیبال — یک فضا، دو رشته.',
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
    tags: ['نورافکن', 'چمن مصنوعی', 'دوربین'],
    image: '/venues/venue-grass-university.jpg',
    seoDescription:
      'رزرو چمن فوتبال با روشنایی شبانه — سانس عصر و شب برای تیم‌ها.',
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
    tags: ['۷ نفره', 'سرپوشیده', 'نوشیدنی'],
    image: '/venues/venue-futsal-shargh.jpg',
    seoDescription:
      'رزرو سالن فوتسال ۷ نفره در شرق تهران — سانس‌های خالی امروز را ببینید.',
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
    tags: ['سالن اختصاصی والیبال', 'سطح A', 'رختکن'],
    image: '/venues/venue-volleyball-north.jpg',
    seoDescription:
      'رزرو سالن والیبال در شمال تهران — مناسب تمرین تیم و مسابقات دوستانه.',
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
    city: 'لواسان',
    tags: ['چمن طبیعی', 'هوای تمیز', 'پارکینگ'],
    image: '/venues/venue-grass-natural.jpg',
    seoDescription:
      'رزرو چمن فوتبال در لواسان — فضای باز و چمن طبیعی برای آخر هفته.',
  },
];
