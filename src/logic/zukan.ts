import type { Train } from './types';

/** この回数の1発正解で図鑑に登録される */
export const UNLOCK_COUNT = 5;
export const STORAGE_KEY = 'train-quiz-zukan';

type Counts = Record<string, number>;

export function loadZukanCounts(): Counts {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const data: unknown = JSON.parse(raw);
    if (typeof data !== 'object' || data === null || Array.isArray(data)) return {};
    const counts: Counts = {};
    for (const [id, n] of Object.entries(data)) {
      if (typeof n === 'number' && Number.isFinite(n) && n > 0) counts[id] = Math.floor(n);
    }
    return counts;
  } catch {
    return {};
  }
}

function save(counts: Counts): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // 保存失敗(容量超過など)は無視。図鑑は進まないがアプリは止めない。
  }
}

export function recordFirstTryCorrect(trainId: string): void {
  const counts = loadZukanCounts();
  counts[trainId] = (counts[trainId] ?? 0) + 1;
  save(counts);
}

export function countFor(trainId: string): number {
  return loadZukanCounts()[trainId] ?? 0;
}

export function isUnlocked(trainId: string): boolean {
  return countFor(trainId) >= UNLOCK_COUNT;
}

export function unlockedCount(trains: Train[]): number {
  const counts = loadZukanCounts();
  return trains.filter((t) => (counts[t.id] ?? 0) >= UNLOCK_COUNT).length;
}
