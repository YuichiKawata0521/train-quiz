import { describe, it, expect } from 'vitest';
import trainsJson from '../src/data/trains.json';
import modesJson from '../src/data/modes.json';
import { validateTrains } from '../src/logic/validate';
import type { Train, Mode } from '../src/logic/types';

const trains = trainsJson as Train[];
const modes = modesJson as Mode[];

describe('trains.json', () => {
  it('データ検証エラーがない', () => {
    expect(validateTrains(trains)).toEqual([]);
  });
  it('全カテゴリに4件以上ある(4択が組める)', () => {
    for (const cat of ['shinkansen', 'express', 'local'] as const) {
      expect(trains.filter((t) => t.category === cat).length).toBeGreaterThanOrEqual(4);
    }
  });
});

describe('validateTrains', () => {
  const base: Train = {
    id: 'a',
    name: { hiragana: 'あ', normal: 'A' },
    category: 'local',
    image: 'images/trains/a.webp',
  };
  it('重複idを検出する', () => {
    expect(validateTrains([base, { ...base }])).toContain('重複id: a');
  });
  it('ひらがな以外の表記を検出する', () => {
    const bad = { ...base, name: { hiragana: 'ドクター', normal: 'D' } };
    expect(validateTrains([bad])).toContain('ひらがな表記が不正: a');
  });
  it('非対称なlookalikesを検出する', () => {
    const b: Train = { ...base, id: 'b', lookalikes: ['a'] };
    expect(validateTrains([base, b])).toContain('lookalikesが非対称: b -> a');
  });
  it('存在しないlookalike先を検出する', () => {
    const b: Train = { ...base, id: 'b', lookalikes: ['zzz'] };
    expect(validateTrains([b])).toContain('lookalike先なし: b -> zzz');
  });
});

describe('modes.json', () => {
  it('4モードあり、ぜんぶモードが全カテゴリを含む', () => {
    expect(modes.map((m) => m.id)).toEqual(['shinkansen', 'express', 'local', 'all']);
    expect(modes.find((m) => m.id === 'all')!.categories).toEqual([
      'shinkansen',
      'express',
      'local',
    ]);
  });
});
