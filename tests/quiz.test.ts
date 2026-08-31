import { describe, it, expect } from 'vitest';
import {
  pickQuestions,
  buildChoices,
  createSession,
  answer,
  isFinished,
  poolForMode,
  type Rng,
} from '../src/logic/quiz';
import type { Train, Mode } from '../src/logic/types';

function rngFrom(seed: number): Rng {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function train(id: string, hiragana: string, category: Train['category'], lookalikes?: string[]): Train {
  return {
    id,
    name: { hiragana, normal: hiragana.toUpperCase() },
    category,
    image: `images/trains/${id}.webp`,
    ...(lookalikes ? { lookalikes } : {}),
  };
}

const azusa = train('azusa', 'あずさ', 'express', ['kaiji']);
const kaiji = train('kaiji', 'かいじ', 'express', ['azusa']);
const expressPool: Train[] = [
  azusa,
  kaiji,
  train('hitachi', 'ひたち', 'express'),
  train('sonic', 'そにっく', 'express'),
  train('kuroshio', 'くろしお', 'express'),
  train('yakumo', 'やくも', 'express'),
];
const mixedPool: Train[] = [
  ...expressPool,
  train('hayabusa', 'はやぶさ', 'shinkansen'),
  train('komachi', 'こまち', 'shinkansen'),
  train('yamanote', 'やまのてせん', 'local'),
];

describe('pickQuestions', () => {
  it('重複なしで指定数を選ぶ', () => {
    const picked = pickQuestions(expressPool, 5, rngFrom(1));
    expect(picked).toHaveLength(5);
    expect(new Set(picked.map((t) => t.id)).size).toBe(5);
  });
  it('プールが足りなければ全件を返す', () => {
    expect(pickQuestions(expressPool, 10, rngFrom(1))).toHaveLength(expressPool.length);
  });
});

describe('buildChoices', () => {
  it('正解1つを含む4択で、表示名の重複がない', () => {
    for (let seed = 0; seed < 50; seed++) {
      const choices = buildChoices(azusa, expressPool, 'hiragana', rngFrom(seed));
      expect(choices).toHaveLength(4);
      expect(choices.filter((c) => c.id === 'azusa')).toHaveLength(1);
      expect(new Set(choices.map((c) => c.name.hiragana)).size).toBe(4);
    }
  });
  it('lookalikesは誤答に出さない', () => {
    for (let seed = 0; seed < 50; seed++) {
      const choices = buildChoices(azusa, expressPool, 'hiragana', rngFrom(seed));
      expect(choices.some((c) => c.id === 'kaiji')).toBe(false);
    }
  });
  it('同カテゴリを優先して誤答を選ぶ(混合プール)', () => {
    for (let seed = 0; seed < 50; seed++) {
      const choices = buildChoices(azusa, mixedPool, 'hiragana', rngFrom(seed));
      // express は正解込みで6件・lookalike除外後4件なので、全部 express で組める
      expect(choices.every((c) => c.category === 'express')).toBe(true);
    }
  });
});

describe('session', () => {
  it('createSession が問題数ぶんの Question を作る', () => {
    const s = createSession(expressPool, 5, 'hiragana', rngFrom(7));
    expect(s.questions).toHaveLength(5);
    for (const q of s.questions) {
      expect(q.choices[q.correctIndex].id).toBe(q.train.id);
    }
  });
  it('一発正解でスコア加算、間違えてからの正解は加算なし', () => {
    const s = createSession(expressPool, 2, 'hiragana', rngFrom(7));
    const q1 = s.questions[0];
    const wrongIndex = q1.correctIndex === 0 ? 1 : 0;
    expect(answer(s, wrongIndex)).toBe('wrong');
    expect(s.current).toBe(0);
    expect(answer(s, q1.correctIndex)).toBe('correct');
    expect(s.current).toBe(1);
    expect(s.score).toBe(0);
    const q2 = s.questions[1];
    expect(answer(s, q2.correctIndex)).toBe('correct');
    expect(s.score).toBe(1);
    expect(isFinished(s)).toBe(true);
  });
});

describe('poolForMode', () => {
  const mode: Mode = {
    id: 'express',
    label: { hiragana: 'とっきゅう', normal: '特急' },
    categories: ['express'],
    heroTrain: 'images/hero/express.svg',
  };
  it('モードのカテゴリだけを返す', () => {
    expect(poolForMode(mode, mixedPool).every((t) => t.category === 'express')).toBe(true);
    expect(poolForMode(mode, mixedPool)).toHaveLength(6);
  });
});
