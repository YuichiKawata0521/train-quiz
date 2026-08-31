// Usage: node scripts/fetch-commons.mjs <id> "<search terms>" [--pick N]
// Searches Wikimedia Commons for a licensed photo, downloads a 1280px thumb to
// assets-src/trains/<id>.jpg, and prints the credit JSON for trains.json.
import { writeFileSync, mkdirSync } from 'node:fs';

const args = process.argv.slice(2);
const pickIdx = args.indexOf('--pick');
const pick = pickIdx >= 0 ? Number(args.splice(pickIdx, 2)[1]) : 1;
const [id, ...terms] = args;
if (!id || terms.length === 0) {
  console.error('usage: node scripts/fetch-commons.mjs <id> "<search terms>" [--pick N]');
  process.exit(1);
}
const api = new URL('https://commons.wikimedia.org/w/api.php');
api.search = new URLSearchParams({
  action: 'query', format: 'json', generator: 'search',
  gsrsearch: `filetype:bitmap ${terms.join(' ')}`, gsrnamespace: '6', gsrlimit: '20',
  prop: 'imageinfo', iiprop: 'url|extmetadata|size|mime', iiurlwidth: '1280',
}).toString();
const UA = { 'User-Agent': 'train-quiz-asset-fetch/1.0 (family project)' };
const data = await (await fetch(api, { headers: UA })).json();
const OK_LICENSE = /^(cc0|cc[ -]by(-sa)?( [0-9.]+)?|public domain|pd)/i;
const candidates = Object.values(data.query?.pages ?? {})
  .map((p) => ({ title: p.title, info: p.imageinfo?.[0] }))
  .filter((c) => c.info && /image\/(jpeg|png)/.test(c.info.mime) && c.info.width >= 800)
  .filter((c) => OK_LICENSE.test((c.info.extmetadata?.LicenseShortName?.value ?? '').trim()))
  .sort((a, b) => b.info.width - a.info.width)
  .slice(0, 8);
if (candidates.length === 0) {
  console.error(`NOT_FOUND: ${id}`);
  process.exit(2);
}
candidates.forEach((c, i) =>
  console.error(`#${i + 1} ${c.title} ${c.info.width}x${c.info.height} [${c.info.extmetadata?.LicenseShortName?.value}]`),
);
const best = candidates[Math.min(pick, candidates.length) - 1];
const meta = best.info.extmetadata;
const img = await fetch(best.info.thumburl ?? best.info.url, { headers: UA });
mkdirSync('assets-src/trains', { recursive: true });
writeFileSync(`assets-src/trains/${id}.jpg`, Buffer.from(await img.arrayBuffer()));
console.log(JSON.stringify({
  id,
  picked: best.title,
  credit: {
    author: (meta.Artist?.value ?? 'unknown').replace(/<[^>]*>/g, '').trim(),
    license: (meta.LicenseShortName?.value ?? '').trim(),
    source: best.info.descriptionurl,
  },
}, null, 2));
