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

/** 1発正解を記録し、その電車の新しいカウントを返す(UNLOCK_COUNT ちょうどなら解禁の瞬間) */
export function recordFirstTryCorrect(trainId: string): number {
  const counts = loadZukanCounts();
  const next = (counts[trainId] ?? 0) + 1;
  counts[trainId] = next;
  save(counts);
  return next;
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

/** 図鑑で一度でも表示した(=お披露目済みの)解禁車両の記録 */
export const SEEN_KEY = 'train-quiz-zukan-seen';

export function loadSeen(): Set<string> {
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    if (!raw) return new Set();
    const data: unknown = JSON.parse(raw);
    if (!Array.isArray(data)) return new Set();
    return new Set(data.filter((v): v is string => typeof v === 'string'));
  } catch {
    return new Set();
  }
}

export function markSeen(trainIds: string[]): void {
  if (trainIds.length === 0) return;
  const seen = loadSeen();
  for (const id of trainIds) seen.add(id);
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify([...seen]));
  } catch {
    // 保存失敗は無視(次回もキラキラが出るだけ)
  }
}
