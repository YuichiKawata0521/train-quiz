import type { Train } from './types';

const HIRAGANA = /^[ぁ-んー ]+$/;
const CATEGORIES = new Set(['shinkansen', 'express', 'local']);
const KANJI = /[一-鿿]/;

export function validateTrains(trains: Train[]): string[] {
  const errors: string[] = [];
  const byId = new Map<string, Train>();
  for (const t of trains) {
    if (byId.has(t.id)) errors.push(`重複id: ${t.id}`);
    byId.set(t.id, t);
    if (!HIRAGANA.test(t.name.hiragana)) errors.push(`ひらがな表記が不正: ${t.id}`);
    if (!CATEGORIES.has(t.category)) errors.push(`カテゴリ不正: ${t.id}`);
    if (!t.image.startsWith('images/trains/')) errors.push(`画像パス不正: ${t.id}`);
    if (!t.description) errors.push(`せつめいなし: ${t.id}`);
    else if (KANJI.test(t.description)) errors.push(`せつめいに漢字: ${t.id}`);
    else if (t.description.length > 80) errors.push(`せつめいが長すぎ: ${t.id}`);
  }
  for (const t of trains) {
    for (const other of t.lookalikes ?? []) {
      const o = byId.get(other);
      if (!o) errors.push(`lookalike先なし: ${t.id} -> ${other}`);
      else if (!(o.lookalikes ?? []).includes(t.id))
        errors.push(`lookalikesが非対称: ${t.id} -> ${other}`);
    }
  }
  return errors;
}
