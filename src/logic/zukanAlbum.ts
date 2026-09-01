import type { Train, Category } from './types';

export const SLOTS_PER_SPREAD = 8;
export const CATEGORY_ORDER: Category[] = ['shinkansen', 'express', 'local'];

export type Slot = Train | null;

/** アルバムの見開き1つ。left/right とも長さ4(2x2) */
export interface Spread {
  left: Slot[];
  right: Slot[];
}

export interface Album {
  spreads: Spread[];
  /** 各カテゴリが始まる見開き番号 */
  categoryStart: Record<Category, number>;
}

export function buildAlbum(trains: Train[]): Album {
  const spreads: Spread[] = [];
  const categoryStart = {} as Record<Category, number>;
  for (const cat of CATEGORY_ORDER) {
    const members = trains.filter((t) => t.category === cat);
    categoryStart[cat] = spreads.length;
    for (let i = 0; i < members.length; i += SLOTS_PER_SPREAD) {
      const slots: Slot[] = members.slice(i, i + SLOTS_PER_SPREAD);
      while (slots.length < SLOTS_PER_SPREAD) slots.push(null);
      spreads.push({ left: slots.slice(0, 4), right: slots.slice(4, 8) });
    }
  }
  return { spreads, categoryStart };
}
