export type NavItem = { href: string; label: string };

export type NavGroup = {

  id: string;

  title: string;

  subtitle?: string;

  items: NavItem[];

};



export const ADMIN_NAV: NavGroup[] = [

  {

    id: 'home',

    title: 'خانه',

    subtitle: 'نمای کلی و میانبرها',

    items: [{ href: '/admin', label: 'داشبورد' }],

  },

  {

    id: 'venues',

    title: 'مجموعه‌ها',

    subtitle: 'زمین، سانس، رسانه',

    items: [

      { href: '/admin/pitches', label: 'مدیریت زمین‌ها' },

      { href: '/admin/pitches/new', label: 'افزودن زمین' },

      { href: '/admin/slots', label: 'سانس‌ها و قیمت' },

    ],

  },

  {

    id: 'ops',

    title: 'عملیات',

    subtitle: 'رزرو و مالکیت',

    items: [

      { href: '/admin/reservations', label: 'رزروها' },

      { href: '/admin/partner-requests', label: 'درخواست همکاری' },

      { href: '/admin/owners', label: 'مالکیت زمین‌ها' },

    ],

  },

  {

    id: 'money',

    title: 'مالی',

    subtitle: 'درآمد و تسویه',

    items: [

      { href: '/admin/finance', label: 'گزارش مالی کل' },

      { href: '/settlement', label: 'تسویه‌ها' },

    ],

  },

  {

    id: 'extra',

    title: 'بیشتر',

    subtitle: 'بازی و خروجی',

    items: [

      { href: '/admin/discounts', label: 'کدهای تخفیف' },

      { href: '/admin/penalty', label: 'تنظیم پنالتی' },

      { href: '/admin/site', label: 'صفحهٔ اصلی' },

      { href: '/admin/export', label: 'خروجی داده' },

    ],

  },

];



export const OWNER_NAV: NavGroup[] = [

  {

    id: 'home',

    title: 'خانه',

    subtitle: 'خلاصه عملکرد',

    items: [{ href: '/owner', label: 'داشبورد' }],

  },

  {

    id: 'venue',

    title: 'مجموعه',

    subtitle: 'زمین و سانس',

    items: [

      { href: '/owner/pitches', label: 'مدیریت زمین‌های من' },

      { href: '/owner/slots', label: 'مدیریت سانس‌ها' },

    ],

  },

  {

    id: 'ops',

    title: 'عملیات',

    subtitle: 'رزرو و مشتری',

    items: [

      { href: '/owner/reservations', label: 'رزروها' },

      { href: '/owner/customers', label: 'مشتریان' },

    ],

  },

  {

    id: 'money',

    title: 'مالی',

    subtitle: 'درآمد و تسویه',

    items: [

      { href: '/finance', label: 'درآمد و گزارش' },

      { href: '/settlement', label: 'تسویه‌حساب' },

    ],

  },

  {

    id: 'personal',

    title: 'رزرو شخصی',

    subtitle: 'به‌عنوان بازیکن',

    items: [{ href: '/player/reservations', label: 'رزروهای من (شخصی)' }],

  },

  {

    id: 'more',

    title: 'بیشتر',

    items: [

      { href: '/owner/reports', label: 'گزارش‌ها' },

      { href: '/owner/messages', label: 'پیام‌ها و اعلان‌ها' },

      { href: '/owner/profile', label: 'پروفایل و تنظیمات' },

    ],

  },

];



export const PLAYER_NAV: NavGroup[] = [

  {

    id: 'home',

    title: 'خانه',

    items: [{ href: '/player', label: 'صفحه اصلی' }],

  },

  {

    id: 'book',

    title: 'رزرو',

    subtitle: 'جستجو و رزروهای شما',

    items: [

      { href: '/gallery', label: 'جستجوی زمین' },

      { href: '/player/reservations', label: 'رزروهای من' },

      { href: '/player/rebook', label: 'رزرو مجدد' },

      { href: '/player/favorites', label: 'علاقه‌مندی‌ها' },

    ],

  },

  {

    id: 'wallet',

    title: 'اعتبار',

    items: [

      { href: '/player/wallet', label: 'کیف پول / اعتبار' },

      { href: '/player/discounts', label: 'تخفیف‌ها' },

    ],

  },

  {

    id: 'account',

    title: 'حساب',

    items: [

      { href: '/player/notifications', label: 'اعلان‌ها' },

      { href: '/player/profile', label: 'پروفایل و تنظیمات' },

    ],

  },

];



/** عنوان پنل در breadcrumb و کارت کاربر */
export function panelRoleLabel(role: 'admin' | 'owner' | 'user'): string {
  if (role === 'admin') return 'مدیر';
  if (role === 'owner') return 'صاحب زمین';
  return 'بازیکن';
}

/** مسیر پیش‌فرض بعد از ورود بر اساس نقش واقعی حساب */
export function dashboardHomeForRole(role: 'admin' | 'owner' | 'user'): string {
  if (role === 'admin') return '/admin';
  if (role === 'owner') return '/owner';
  return '/player';
}

/** منوی مالی/تسویه برای مالک — در layout عمومی استفاده می‌شود */

export function navForRole(role: 'admin' | 'owner' | 'user'): NavGroup[] {

  if (role === 'admin') return ADMIN_NAV;

  if (role === 'owner') return OWNER_NAV;

  return PLAYER_NAV;

}



export function breadcrumbLabel(pathname: string): string {

  const map: Record<string, string> = {

    '/admin': 'داشبورد',

    '/admin/pitches': 'مدیریت زمین‌ها',

    '/admin/pitches/new': 'افزودن زمین',

    '/admin/slots': 'سانس و قیمت',

    '/admin/reservations': 'رزروها',

    '/admin/partner-requests': 'درخواست همکاری',

    '/admin/owners': 'مالکیت',

    '/admin/finance': 'مالی کل',

    '/admin/discounts': 'کدهای تخفیف',
    '/admin/penalty': 'پنالتی',

    '/admin/site': 'صفحهٔ اصلی',

    '/admin/export': 'خروجی',

    '/owner': 'داشبورد',

    '/owner/pitches': 'زمین‌های من',

    '/owner/pitch': 'ویرایش زمین',

    '/owner/slots': 'مدیریت سانس‌ها',

    '/owner/reservations': 'رزروها',

    '/owner/customers': 'مشتریان',

    '/owner/reports': 'گزارش‌ها',

    '/owner/messages': 'پیام‌ها',

    '/owner/profile': 'پروفایل',

    '/finance': 'درآمد',

    '/settlement': 'تسویه',

    '/player': 'صفحه اصلی',

    '/player/search': 'جستجوی زمین',

    '/player/reservations': 'رزروهای من',

    '/player/rebook': 'رزرو مجدد',

    '/player/favorites': 'علاقه‌مندی‌ها',

    '/player/wallet': 'کیف پول',

    '/player/discounts': 'تخفیف‌ها',

    '/player/notifications': 'اعلان‌ها',

    '/player/profile': 'پروفایل',

    '/profile': 'پروفایل',

  };

  if (map[pathname]) return map[pathname];

  return 'پنل';

}


