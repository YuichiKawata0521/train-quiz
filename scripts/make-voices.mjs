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

// 誤読の修正マップ(ひらがな→カタカナ表記で読みを固定する)。
// カタカナは音読みそのままになるため、助詞を含まない語にのみ使うこと。
const READING_FIXES = [
  ['はかた', 'ハカタ'],
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

/** ひらがな→カタカナ(検証用の素朴な期待読み) */
function toKatakana(s) {
  return s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));
}

/** エンジンの読み(kana)と期待読みの差分を返す。助詞由来の ハ→ワ / ヘ→エ は許容 */
function checkReading(text, kana) {
  const expected = toKatakana(text).replace(/[^ァ-ヶー]/g, '');
  const actual = kana.replace(/[^ァ-ヶー]/g, '');
  if (expected === actual) return null;
  // 許容差分: 位置ごとに ハ↔ワ / ヘ↔エ / ヲ↔オ のみなら助詞の読みとして正しい
  if (expected.length === actual.length) {
    const diffs = [];
    for (let i = 0; i < expected.length; i++) {
      if (expected[i] !== actual[i]) diffs.push(`${i}:${expected[i]}→${actual[i]}`);
    }
    const particleOnly = diffs.every(
      (d) => /→ワ$/.test(d) && /:ハ/.test(d) || /→エ$/.test(d) && /:ヘ/.test(d) || /→オ$/.test(d) && /:ヲ/.test(d),
    );
    return { diffs, particleOnly };
  }
  return { diffs: [`長さ違い: 期待${expected.length} 実際${actual.length}`, expected, actual], particleOnly: false };
}

const warnings = [];
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

  const check = checkReading(text, query.kana ?? '');
  if (check && !check.particleOnly) {
    warnings.push(`${train.id}: ${check.diffs.join(' / ')}\n  text: ${text}\n  kana: ${query.kana}`);
  }

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
if (warnings.length) {
  console.log(`\n⚠ 読みの要確認 ${warnings.length}件(READING_FIXES での修正を検討):`);
  for (const w of warnings) console.log(w);
} else {
  console.log('読みの検証: 助詞以外の差分なし');
}
