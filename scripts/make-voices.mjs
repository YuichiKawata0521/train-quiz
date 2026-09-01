// VOICEVOX Engine (http://127.0.0.1:50021) で図鑑のせつめい音声を生成する。
//   1. docker run --rm -p 50021:50021 voicevox/voicevox_engine:cpu-latest
//   2. node scripts/make-voices.mjs [--only id1,id2]
// 出力: public/voices/<trainId>.m4a(なまえ→せつめい を ずんだもん が読む)
//
// 読み方の検証: 説明文はひらがな(=ほぼ読みそのもの)なので、エンジンの
// 解析結果(kana)を期待読みと突き合わせ、助詞(は/へ)以外の差分を警告する。
// 誤読は READING_FIXES で入力側をカタカナ表記に直して解消する。
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ENGINE = 'http://127.0.0.1:50021';
const SPEAKER = 3; // ずんだもん(ノーマル)
const OUT_DIR = 'public/voices';

// 誤読の修正マップ(カタカナ表記等で読みを固定する)。
// カタカナは表記どおり読まれるため、助詞(は/へ/を)を含む範囲には使わないこと。
// 全件の読みは voices-reading-report.txt で目視検証済み(2026-09-01)。
const READING_FIXES = [
  ['はかた', 'ハカタ'], // ワカタ と誤読
  ['しんはこだて', 'シンハコダテ'], // シンワコダテ と誤読
  ['はこね', 'ハコネ'], // ワコネ と誤読
  ['ちちぶまで', 'チチブマデ'], // 「まで+はしる」が「までは+しる」に誤分割
  ['1ぽん', 'いっぽん'], // イチポン と誤読
  ['40ぷん', 'ヨンジュップン'], // ヨンジュウ・プン と誤読(かな指定だと更に分断されるためカタカナ一語)
  ['まるのうち', 'マルノウチ'], // マルノオチ と長音化
  ['あそぼーい', 'アソボーイ'], // ア・ソ・ボー・イ と分断
];

const only = process.argv.includes('--only')
  ? new Set(process.argv[process.argv.indexOf('--only') + 1].split(','))
  : null;

const trains = JSON.parse(readFileSync('src/data/trains.json', 'utf8'));
mkdirSync(OUT_DIR, { recursive: true });

/** 音声用テキスト: なまえ。せつめい(分かち書きスペースは解析を壊すので除去) */
function speechText(train) {
  let text = `${train.name.hiragana}。${train.description}`.replace(/ /g, '');
  for (const [from, to] of READING_FIXES) text = text.replaceAll(from, to);
  return text;
}

// 読みの機械照合は長音正規化(トウ→トオ)や数字展開(320→サンビャクニジュッ)で
// 誤検知だらけになるため、全件の読み(kana)をレポートに書き出して人が確認する。
const readingReport = [];
let done = 0;
for (const train of trains) {
  if (only && !only.has(train.id)) continue;
  const text = speechText(train);
  const queryRes = await fetch(
    `${ENGINE}/audio_query?speaker=${SPEAKER}&text=${encodeURIComponent(text)}`,
    { method: 'POST' },
  );
  if (!queryRes.ok) throw new Error(`audio_query失敗: ${train.id} ${queryRes.status}`);
  const query = await queryRes.json();
  readingReport.push(`${train.id}\n  text: ${text}\n  kana: ${query.kana}`);

  query.speedScale = 0.95; // 子ども向けに少しゆっくり
  query.outputSamplingRate = 24000;
  query.outputStereo = false;

  const synthRes = await fetch(`${ENGINE}/synthesis?speaker=${SPEAKER}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  if (!synthRes.ok) throw new Error(`synthesis失敗: ${train.id} ${synthRes.status}`);
  const wav = Buffer.from(await synthRes.arrayBuffer());
  const tmpWav = `${OUT_DIR}/.tmp-${train.id}.wav`;
  writeFileSync(tmpWav, wav);
  // afconvert(macOS標準)で AAC/m4a 化してサイズを1/10程度に
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '48000', tmpWav, `${OUT_DIR}/${train.id}.m4a`]);
  rmSync(tmpWav);
  done++;
  if (done % 10 === 0) console.log(`${done}件…`);
}

console.log(`生成完了: ${done}件 → ${OUT_DIR}/`);
writeFileSync('voices-reading-report.txt', readingReport.join('\n') + '\n');
console.log('読みレポート: voices-reading-report.txt(目視確認し、誤読は READING_FIXES へ)');
