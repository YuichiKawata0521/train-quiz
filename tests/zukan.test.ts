import { describe, it, expect, beforeEach } from 'vitest';
import {
  loadZukanCounts,
  recordFirstTryCorrect,
  countFor,
  isUnlocked,
  unlockedCount,
  UNLOCK_COUNT,
  STORAGE_KEY,
  loadSeen,
  markSeen,
  SEEN_KEY,
} from '../src/logic/zukan';
import type { Train } from '../src/logic/types';

function train(id: string): Train {
  return {
    id,
    name: { hiragana: 'てすと', normal: 'テスト' },
    category: 'local',
    image: `images/trains/${id}.webp`,
    description: 'てすとの せつめいだよ。',
  };
}

beforeEach(() => localStorage.clear());

describe('図鑑の進捗', () => {
  it('未記録の電車は0回・未解禁', () => {
    expect(countFor('e5-hayabusa')).toBe(0);
    expect(isUnlocked('e5-hayabusa')).toBe(false);
  });

  it('1発正解を記録すると該当の電車だけ1ずつ増える', () => {
    recordFirstTryCorrect('e5-hayabusa');
    recordFirstTryCorrect('e5-hayabusa');
    expect(countFor('e5-hayabusa')).toBe(2);
    expect(countFor('komachi')).toBe(0);
  });

  it('UNLOCK_COUNT回で解禁され、以降も数え続ける', () => {
    for (let i = 0; i < UNLOCK_COUNT; i++) recordFirstTryCorrect('e5-hayabusa');
    expect(isUnlocked('e5-hayabusa')).toBe(true);
    recordFirstTryCorrect('e5-hayabusa');
    expect(countFor('e5-hayabusa')).toBe(UNLOCK_COUNT + 1);
  });

  it('localStorageに永続化される', () => {
    recordFirstTryCorrect('e5-hayabusa');
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ 'e5-hayabusa': 1 });
  });

  it('壊れたJSONは空として扱い、記録も継続できる', () => {
    localStorage.setItem(STORAGE_KEY, '{oops');
    expect(loadZukanCounts()).toEqual({});
    recordFirstTryCorrect('a');
    expect(countFor('a')).toBe(1);
  });

  it('型が不正な値は捨て、小数は切り捨てる', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ a: 'x', b: -2, c: 3.7, d: 2 }));
    expect(loadZukanCounts()).toEqual({ c: 3, d: 2 });
  });

  it('配列が保存されていても空として扱う', () => {
    localStorage.setItem(STORAGE_KEY, '[1,2]');
    expect(loadZukanCounts()).toEqual({});
  });

  it('unlockedCount: 解禁済みの台数を数える', () => {
    const trains = [train('a'), train('b'), train('c')];
    for (let i = 0; i < UNLOCK_COUNT; i++) recordFirstTryCorrect('a');
    for (let i = 0; i < UNLOCK_COUNT - 1; i++) recordFirstTryCorrect('b');
    expect(unlockedCount(trains)).toBe(1);
  });
});

describe('解禁の瞬間と おひろめ記録', () => {
  it('recordFirstTryCorrect は新しいカウントを返す(UNLOCK_COUNTちょうどで解禁の瞬間)', () => {
    for (let i = 1; i < UNLOCK_COUNT; i++) {
      expect(recordFirstTryCorrect('e5-hayabusa')).toBe(i);
    }
    expect(recordFirstTryCorrect('e5-hayabusa')).toBe(UNLOCK_COUNT);
    expect(recordFirstTryCorrect('e5-hayabusa')).toBe(UNLOCK_COUNT + 1);
  });

  it('markSeen/loadSeen: 記録した id が積み上がる', () => {
    expect(loadSeen().size).toBe(0);
    markSeen(['a', 'b']);
    markSeen(['b', 'c']);
    expect([...loadSeen()].sort()).toEqual(['a', 'b', 'c']);
  });

  it('壊れた seen データは空として扱う', () => {
    localStorage.setItem(SEEN_KEY, '{broken');
    expect(loadSeen().size).toBe(0);
    localStorage.setItem(SEEN_KEY, JSON.stringify({ not: 'array' }));
    expect(loadSeen().size).toBe(0);
    localStorage.setItem(SEEN_KEY, JSON.stringify(['ok', 42, null]));
    expect([...loadSeen()]).toEqual(['ok']);
  });
});
