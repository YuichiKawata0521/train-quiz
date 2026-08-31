const STORAGE_KEY = 'train-quiz-playtime';

/** 1日の遊べる時間(秒) */
export const DAILY_LIMIT_SECONDS = 15 * 60;

interface PlayTimeRecord {
  date: string;
  seconds: number;
}

export function todayKey(now: Date = new Date()): string {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function loadRecord(now: Date): PlayTimeRecord {
  const today = todayKey(now);
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as PlayTimeRecord;
      if (parsed.date === today && typeof parsed.seconds === 'number') return parsed;
    }
  } catch {
    // 壊れた保存値は今日0秒として扱う
  }
  return { date: today, seconds: 0 };
}

/** 今日の消費秒数 */
export function loadPlayTime(now: Date = new Date()): number {
  return loadRecord(now).seconds;
}

/** 消費秒数を加算して保存し、合計を返す */
export function addPlayTime(seconds: number, now: Date = new Date()): number {
  const record = loadRecord(now);
  record.seconds += seconds;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(record));
  return record.seconds;
}

/** 今日の制限に到達したか */
export function isTimeUp(now: Date = new Date()): boolean {
  return loadPlayTime(now) >= DAILY_LIMIT_SECONDS;
}
