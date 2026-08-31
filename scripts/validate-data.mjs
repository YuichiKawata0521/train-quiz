import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';

const trains = JSON.parse(readFileSync('src/data/trains.json', 'utf8'));
const errors = [];
const ids = new Set();
for (const t of trains) {
  if (ids.has(t.id)) errors.push(`重複id: ${t.id}`);
  ids.add(t.id);
  if (!existsSync(`public/${t.image}`)) errors.push(`画像なし: ${t.id} (${t.image})`);
  if (!t.credit?.author || !t.credit?.license || !t.credit?.source)
    errors.push(`クレジット不備: ${t.id}`);
}
for (const t of trains) {
  for (const l of t.lookalikes ?? []) {
    if (!ids.has(l)) errors.push(`lookalike先なし: ${t.id} -> ${l}`);
  }
}
const files = readdirSync('public/images/trains');
const totalMB = files.reduce((s, f) => s + statSync(`public/images/trains/${f}`).size, 0) / 1e6;
console.log(`trains: ${trains.length}件 / 画像: ${files.length}枚 計${totalMB.toFixed(1)}MB`);
if (totalMB > 25) errors.push(`画像合計が25MBを超過(${totalMB.toFixed(1)}MB)`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('OK');
