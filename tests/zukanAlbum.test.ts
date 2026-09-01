import { describe, it, expect } from 'vitest';
import { buildAlbum, SLOTS_PER_SPREAD } from '../src/logic/zukanAlbum';
import trainsJson from '../src/data/trains.json';
import type { Train, Category } from '../src/logic/types';

const real = trainsJson as Train[];

function train(id: string, category: Category): Train {
  return {
    id,
    name: { hiragana: 'てすと', normal: 'テスト' },
    category,
    image: `images/trains/${id}.webp`,
  };
}

describe('buildAlbum', () => {
  it('実データ: 16見開き、カテゴリ先頭は 0 / 3 / 11', () => {
    const album = buildAlbum(real);
    expect(album.spreads).toHaveLength(16);
    expect(album.categoryStart).toEqual({ shinkansen: 0, express: 3, local: 11 });
  });

  it('実データ: 全119件がカテゴリ順(しんかんせん→とっきゅう→ふつう)で並ぶ', () => {
    const album = buildAlbum(real);
    const flat = album.spreads
      .flatMap((s) => [...s.left, ...s.right])
      .filter((t): t is Train => t !== null);
    expect(flat).toHaveLength(real.length);
    expect(flat.map((t) => t.id)).toEqual([
      ...real.filter((t) => t.category === 'shinkansen').map((t) => t.id),
      ...real.filter((t) => t.category === 'express').map((t) => t.id),
      ...real.filter((t) => t.category === 'local').map((t) => t.id),
    ]);
  });

  it('実データ: しんかんせん3見開き目は2件だけ入り、残りはnull埋め(18=8+8+2)', () => {
    const album = buildAlbum(real);
    const third = album.spreads[2];
    expect(third.left).toHaveLength(4);
    expect(third.right).toHaveLength(4);
    expect(third.left.filter(Boolean)).toHaveLength(2);
    expect(third.right.filter(Boolean)).toHaveLength(0);
  });

  it('合成データ: 9件は2見開き(8+1)、各カテゴリは新しい見開きから始まる', () => {
    const trains = [
      ...Array.from({ length: 9 }, (_, i) => train(`s${i}`, 'shinkansen')),
      train('e1', 'express'),
      train('l1', 'local'),
    ];
    const album = buildAlbum(trains);
    expect(album.spreads).toHaveLength(4);
    expect(album.categoryStart).toEqual({ shinkansen: 0, express: 2, local: 3 });
    expect(album.spreads[1].left.filter(Boolean)).toHaveLength(1);
    expect(album.spreads[2].left[0]!.id).toBe('e1');
  });

  it('SLOTS_PER_SPREAD は 8(2x2 x 2ページ)', () => {
    expect(SLOTS_PER_SPREAD).toBe(8);
  });
});
