/** محدودهٔ جغرافیایی داخل تهران — فیلتر گالری */
export type TehranZone = 'east' | 'west' | 'north' | 'south' | 'center';

export const TEHRAN_ZONE_LABEL: Record<TehranZone, string> = {
  east: 'شرق تهران',
  west: 'غرب تهران',
  north: 'شمال تهران',
  south: 'جنوب تهران',
  center: 'مرکز تهران',
};

/** ترتیب نمایش در فیلتر */
export const TEHRAN_ZONE_ORDER: TehranZone[] = [
  'center',
  'east',
  'west',
  'north',
  'south',
];

const EAST =
  /نارمک|پیروزی|تهران[\s-]?پارس|دماوند|نیروی[\s]?هوایی|افسریه|تهرانپارس|رسالت|مجیدیه|سبلان|نظام[\s]?آباد|پاسداران|قنات[\s]?کوثر|شهرک[\s]?غرب(?!)/i;
const WEST =
  /صادقیه|کاشانی|آزادی|ستاری|شهر[\s]?زیبا|شهرک[\s]غرب|تهران[\s]?سر|پونک|اکباتان|گیشا|طرشت|جنت[\s]?آباد|سازمان[\s]?برنامه/i;
const NORTH =
  /تجریش|دربند|ولنجک|نیاوران|لواسان|شمیران|زعفرانیه|الهیه|فرمانیه|اقدسیه|کامرانیه|اوین|سعادت[\s]?آباد(?!)/i;
const SOUTH =
  /شهر[\s]?ری|کهریزک|یافت[\s]?آباد|خزانه|نعمت[\s]?آباد|مریم[\s]?آباد|بعثت|مشیریه|شوش|فلاح|دولت[\s]?آباد|منیریه/i;
const CENTER =
  /ولیعصر|ونک|ملت|کشاورز|انقلاب|جمهوری|فاطمی|میرداماد|سید[\s]?خندان|حافظ|کارگر|فلسطین|طالقانی|بهارستان|امیرآباد|جردن|مفتح|سمیه|مطهری/i;

/** از روی آدرس (و در صورت نیاز lng) محدوده را حدس می‌زند */
export function inferTehranZone(address: string, lng?: number): TehranZone {
  const a = address.trim();
  if (EAST.test(a)) return 'east';
  if (WEST.test(a)) return 'west';
  if (NORTH.test(a)) return 'north';
  if (SOUTH.test(a)) return 'south';
  if (CENTER.test(a)) return 'center';

  if (typeof lng === 'number' && Number.isFinite(lng)) {
    if (lng >= 51.48) return 'east';
    if (lng <= 51.32) return 'west';
    if (lng >= 51.42 && lng < 51.48) return 'north';
    if (lng < 51.38) return 'south';
  }

  return 'center';
}

export function tehranZoneLabel(zone: TehranZone): string {
  return TEHRAN_ZONE_LABEL[zone];
}
