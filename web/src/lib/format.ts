import { numFa } from './jalali';

export function priceFa(n: number): string {
  return numFa(n.toLocaleString('en'));
}

/** سایز زمین فوتسال/چمن — مثلاً ۵ به ۵ */
export function pitchSizeLabel(size: number): string {
  return `${numFa(size)} به ${numFa(size)}`;
}
