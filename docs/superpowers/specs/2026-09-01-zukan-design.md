# でんしゃずかん(図鑑)機能 設計書

- 日付: 2026-09-01
- ステータス: 承認済み(チャットで設計合意)
- 対象: でんしゃクイズ v1 への追加機能

## 概要

クイズで「1発正解」を電車ごとに5回集めると、その電車の写真が図鑑に登録され、
ひらがなの説明文が読めるようになる。図鑑は写真アルバム風の見開きUIで、
カテゴリタブから各カテゴリの先頭ページへジャンプできる。

## 用語

- **1発正解**: その問題で一度も間違えずに正解すること(クイズの得点条件と同一。
  `SessionState.failedThisQuestion` が false のまま正解した場合)。
- **解禁**: ある電車の1発正解カウントが 5 以上になり、図鑑で写真と説明が見られる状態。

## 機能要件

### 1. あつめの仕組み

- 電車ごとに1発正解の回数を数える。1発正解1回につき該当電車のカウント +1。
- リトライ後の正解はカウントしない。
- カウントは 5 で止めず数え続ける(解禁判定は `count >= 5`)。
- 永続化: localStorage キー `train-quiz-zukan`。値は `Record<trainId, number>` の JSON。
- 壊れたデータ(JSONパース不能・型不正)は空 `{}` として扱い、クラッシュしない。

### 2. カウントのフック位置

[src/screens/question.ts](../../src/screens/question.ts) の choice クリックハンドラ。
`answer()` は正解時に `failedThisQuestion` をリセットするため、**呼び出し前に**
`const firstTry = !session.failedThisQuestion` を控え、
`result === 'correct' && firstTry` のとき `recordFirstTryCorrect(q.train.id)` を呼ぶ。
クイズロジック(`src/logic/quiz.ts`)は変更しない。

### 3. 進捗ロジック API(新規 `src/logic/zukan.ts`)

```ts
export const UNLOCK_COUNT = 5;
export const STORAGE_KEY = 'train-quiz-zukan';
export function loadZukanCounts(): Record<string, number>;
export function recordFirstTryCorrect(trainId: string): void;
export function countFor(trainId: string): number;      // 0..n
export function isUnlocked(trainId: string): boolean;   // countFor >= UNLOCK_COUNT
export function unlockedCount(trains: Train[]): number; // 解禁済み台数(カウンター表示用)
```

実装パターンは `src/logic/playTimer.ts` に倣う(localStorage 直アクセス、
try/catch で破損耐性)。

### 4. 図鑑への入口

- ゲーム選択画面(`gameSelect`)のカードに「でんしゃずかん」を追加(クイズの隣)。
- アイコンは `images/zukan/cover.webp`(アルバム表紙、ユーザーが Gemini 生成)。
- タップで `zukan` 画面へ遷移。

### 5. アルバム UI(新規 `src/screens/zukan.ts`、ScreenName `'zukan'`)

- **見開き構成**: 左右2ページ、片面 2×2 = 4枠、1見開き 8車両。
- **並び順**: trains.json の順で しんかんせん(18)→ とっきゅう(64)→ ふつうでんしゃ(37)。
  各カテゴリは**新しい見開きの先頭**から始まる。
  見開き数: しんかんせん 3(空き6枠)+ とっきゅう 8(空き0)+ ふつうでんしゃ 5(空き3)= **計16見開き**。
  空き枠は何も表示しない。
- **カテゴリタブ**: 右ページ右上にインデックスシール風の3タブ(しんかんせん/とっきゅう/
  ふつうでんしゃ)。CSS で描画(画像不要)。タップで各カテゴリ先頭見開きへジャンプ。
  現在表示中のカテゴリのタブを強調表示。
- **ページ送り**: 画面左右に大きな ◀ ▶ ボタン。先頭見開きでは ◀ を、末尾では ▶ を
  無効化(disabled + 半透明。レイアウトが動かないよう非表示にはしない)。
  めくり時に `tap` 音を再生。
  アニメーションは CSS transition の軽いもの(フェード+スライド程度)。
  iPad 第6世代でカクつく凝った 3D めくりは採用しない。
- **解禁済みスロット**: 白フチのチェキ風写真+下にひらがな名。タップで**拡大カード**
  (オーバーレイ): 大きな写真+ひらがな名(大)+正式名 `name.normal`(小・グレー)+
  せつめい文+「とじる」ボタン。とじるとアルバムに戻る(ページ位置保持)。
- **未解禁スロット**: 同じ写真に CSS フィルタ
  `blur(10px) brightness(0.35) grayscale(1)` をかけた「かげ」表示+
  ⭐スタンプ5個(集めた回数ぶん色付き・残りグレー)。タップしても何も起きない。
  ※実写写真のため切り抜きシルエットではなく「暗いぼかし写真」となる(合意済み)。
- **カウンター**: 右下に「あつめた n/119」を小さく表示。
- **もどる**: 左下の既存スタイル `btn-back` で `gameSelect` へ。

### 6. 説明文データ

- `trains.json` の全119エントリに `description: string` を追加(`Train` 型にも追加)。
- 表記: ひらがな中心、カタカナは外来語の最小限(例: キロ)。数字は算用数字可。
- 分量: 2〜3文・目安70文字以内。内容: どこからどこまで走るか/色・速さなどの特徴/
  まめちしき。
- 執筆者: Claude が全件執筆。事実に自信がない項目は一般的で確実な記述に留める。
- `scripts/validate-data.mjs` に「description 必須(非空文字列)」チェックを追加。

### 7. タイマー連動

- `'zukan'` を `LOCKABLE` に追加(1日15分を使い切ったら図鑑も開けない。
  おとなモードで解除は従来どおり)。図鑑閲覧時間は既存の計測方式のまま
  アプリ表示時間としてカウントされる。

### 8. アセット

| ファイル | 内容 | 入手 |
|---|---|---|
| `public/images/zukan/album.webp` | 開いたアルバムの見開き背景(横長・無地クリームページ) | ユーザーが Gemini 生成 → Claude が webp 変換 |
| `public/images/zukan/cover.webp` | 閉じたアルバム表紙(ボタン用アイコン) | 同上 |

- 背景画像の上に CSS でページ領域(% 指定)を重ね、写真スロットをグリッド配置する。
  画像受領後に位置を微調整する。
- **画像が届くまでは CSS フォールバック**(クリーム色ページ+中央とじ目影)で実装を
  進め、受領後に差し替える。
- PWA precache: `images/zukan/*.webp` は既存 globPatterns(webp)で自動的に対象になる
  ことを確認する。

## 画面遷移

```
gameSelect ──「でんしゃずかん」──> zukan ──もどる──> gameSelect
zukan 内: ◀▶ページ送り / タブジャンプ / 写真タップ→拡大カード→とじる
```

`ScreenName` に `'zukan'` を追加し、`screens` レジストリに登録する。

## テスト計画

- **zukan ロジック**: 記録で+1 / 5以上で解禁 / 5超も加算継続 / 未記録は0 /
  破損 localStorage で空扱い / unlockedCount。
- **question フック**: 1発正解で record が呼ばれる / リトライ後の正解では呼ばれない。
- **zukan 画面**: 未解禁はフィルタ+スタンプ表示・タップ無反応 / 解禁済みは名前表示・
  タップで拡大カード・とじるで戻る / タブでカテゴリ先頭見開きへ / ◀▶で見開き移動と
  端での非表示 / カウンター表示。
- **データ検証**: 全 train に非空 description(validate-data.mjs と Vitest の両方)。

## 非スコープ(YAGNI)

- 切り抜きシルエット画像の自動生成(不満が出たら後日)
- 図鑑の音声読み上げ、解禁時のお祝い演出、さんすうゲーム
- 説明文の漢字表記切替(ひらがなのみ)

## 受け入れ基準

1. クイズで同じ電車に1発正解を5回すると、図鑑でその電車の写真と説明が見られる。
2. リトライ後の正解ではスタンプが増えない。
3. 図鑑は見開き16ページ、タブで各カテゴリ先頭へ飛べる。
4. 未解禁はぼかし写真+スタンプで進み具合がわかる。
5. 時間切れ時(おとなモードOFF)は図鑑も開けない。
6. 既存テスト全通過+新規テスト追加。オフライン(PWA)でも図鑑が動く。
