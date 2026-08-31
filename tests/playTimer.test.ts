import { describe, it, expect, beforeEach } from 'vitest';
import {
  DAILY_LIMIT_SECONDS,
  todayKey,
  loadPlayTime,
  addPlayTime,
  isTimeUp,
} from '../src/logic/playTimer';

beforeEach(() => localStorage.clear());

describe('todayKey', () => {
  it('ローカル日付を YYYY-MM-DD で返す', () => {
    expect(todayKey(new Date(2026, 7, 31, 23, 59))).toBe('2026-08-31');
    expect(todayKey(new Date(2026, 0, 5, 0, 0))).toBe('2026-01-05');
  });
});

describe('playTime', () => {
  const day1 = new Date(2026, 7, 31, 10, 0);
  const day2 = new Date(2026, 8, 1, 10, 0);

  it('未記録なら0', () => {
    expect(loadPlayTime(day1)).toBe(0);
  });

  it('加算した秒数が永続化される', () => {
    addPlayTime(10, day1);
    addPlayTime(5, day1);
    expect(loadPlayTime(day1)).toBe(15);
  });

  it('日付が変わるとリセットされる', () => {
    addPlayTime(600, day1);
    expect(loadPlayTime(day2)).toBe(0);
    addPlayTime(3, day2);
    expect(loadPlayTime(day2)).toBe(3);
  });

  it('壊れた保存値は0扱い', () => {
    localStorage.setItem('train-quiz-playtime', '{oops');
    expect(loadPlayTime(day1)).toBe(0);
  });

  it('isTimeUp は制限到達で true', () => {
    addPlayTime(DAILY_LIMIT_SECONDS - 1, day1);
    expect(isTimeUp(day1)).toBe(false);
    addPlayTime(1, day1);
    expect(isTimeUp(day1)).toBe(true);
  });
});
