import { numFa } from './jalali';

export function priceFa(n: number): string {
  return numFa(n.toLocaleString('en'));
}
