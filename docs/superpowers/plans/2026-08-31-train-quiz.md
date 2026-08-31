# でんしゃクイズ 実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 4歳児向けの電車名当てクイズPWA(オフライン完全対応、iPad第6世代のSafari向け)を構築する。

**Architecture:** Vite + TypeScript のフレームワークなしSPA。`#app` 内のDOMを画面モジュールが差し替える単純な画面遷移。クイズロジック(抽選・選択肢生成・スコア)は純粋関数としてUIから分離し、Vitestでテストする。全素材はローカル同梱し、vite-plugin-pwa(Workbox)でプリキャッシュして完全オフライン化。GitHub Pagesにデプロイ。

**Tech Stack:** Vite / TypeScript / Vitest + happy-dom / vite-plugin-pwa / sharp(画像・アイコン変換スクリプト) / GitHub Pages + GitHub Actions

**Spec:** `docs/superpowers/specs/2026-08-31-train-quiz-design.md`

## Global Constraints

- 対象端末: iPad 第6世代(iPadOS 17 / Safari)。ES2020 までの構文・APIのみ使用
- 子どもに見せる文言はすべてひらがな(+長音「ー」)。表記設定 `normal` 時のみ通常表記
- タップ領域は最低 120×80pt 目安。ボタンは大きく
- オフライン完全対応: 実行時に外部URLへのリクエストを一切しない(フォントもシステムフォント)
- 素材合計 30MB 以内(画像は WebP・長辺800px・1枚150KB前後)
- Vite の `base` は `'/train-quiz/'`(GitHub Pages のサブパス)。アセット参照は必ず `asset()` ヘルパー経由
- UIフレームワーク・実行時依存ライブラリは追加しない(devDependenciesのみ)
- 効果音の再生はタップ起点 + 初回タップでアンロック(iOS自動再生制限対応)
- コミットメッセージは英語の conventional commits(`feat:` `test:` `chore:` 等)

## ファイル構成(最終形)

```
train-quiz/
├── index.html
├── package.json / tsconfig.json / vite.config.ts / .gitignore
├── .github/workflows/deploy.yml
├── scripts/
│   ├── make-sounds.mjs      # 効果音WAV生成(依存なし)
│   ├── make-icons.mjs       # PWAアイコンPNG生成(sharp)
│   ├── convert-images.mjs   # 写真→WebP変換(sharp)
│   └── validate-data.mjs    # データ・画像・容量の検証
├── assets-src/trains/       # 写真の原本(gitignore対象)
├── docs/image-sourcing.md   # 写真収集の手順書
├── public/
│   ├── icon.svg / icons/*.png
│   ├── images/
│   │   ├── trains/*.webp    # 問題写真
│   │   ├── conductor/{normal,happy,sad,celebrate}.png  # ユーザー支給(未着でも動く)
│   │   ├── hero/{shinkansen,express,local,all}.svg     # 代表電車イラスト
│   │   └── bg/platform.svg  # 駅ホーム背景
│   └── sounds/*.wav
├── src/
│   ├── main.ts              # 起動のみ
│   ├── app.ts               # AppContext・画面レジストリ・navigate
│   ├── styles.css
│   ├── audio.ts             # 効果音プレイヤー
│   ├── data/{trains,modes}.json
│   ├── logic/{types,settings,quiz,validate}.ts   # 純ロジック(テスト対象)
│   ├── ui/{asset,longPress}.ts
│   └── screens/{start,gameSelect,modeSelect,question,travel,result,settingsScreen}.ts
└── tests/*.test.ts
```

---

### Task 1: プロジェクト初期化

**Files:**
- Create: `package.json`, `tsconfig.json`, `vite.config.ts`, `index.html`, `.gitignore`, `src/main.ts`, `src/styles.css`

**Interfaces:**
- Produces: `npm run dev / build / test` が動く土台。`base: '/train-quiz/'`、Vitest環境 `happy-dom`

- [ ] **Step 1: 設定ファイル一式を作成**

`package.json`:
```json
{
  "name": "train-quiz",
  "private": true,
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview",
    "test": "vitest run",
    "test:watch": "vitest"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "strict": true,
    "resolveJsonModule": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "noEmit": true,
    "types": ["vite/client"]
  },
  "include": ["src", "tests"]
}
```

`vite.config.ts`:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/train-quiz/',
  test: { environment: 'happy-dom' },
});
```

`index.html`:
```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no" />
    <title>でんしゃクイズ</title>
  </head>
  <body>
    <div id="app"></div>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

`.gitignore`:
```
node_modules/
dist/
dev-dist/
assets-src/
```

`src/main.ts`(Task 5 で置き換えるまでの起動確認用):
```ts
import './styles.css';

document.querySelector<HTMLDivElement>('#app')!.textContent = 'でんしゃクイズ じゅんびちゅう';
```

`src/styles.css`(基本リセットのみ。画面別スタイルは Task 5 以降):
```css
:root {
  --blue: #1c7ed6;
  --blue-dark: #1864ab;
  --red: #e03131;
  font-family: 'Hiragino Maru Gothic ProN', 'BIZ UDGothic', 'Yu Gothic', sans-serif;
}
* { box-sizing: border-box; margin: 0; padding: 0; }
html, body, #app { height: 100%; }
body {
  background: #e7f5ff;
  -webkit-user-select: none;
  user-select: none;
  touch-action: manipulation;
  overflow: hidden;
}
```

- [ ] **Step 2: 依存をインストール**

Run: `npm install -D typescript vite vitest happy-dom`

- [ ] **Step 3: ビルドが通ることを確認**

Run: `npm run build`
Expected: `dist/` が生成され exit 0

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + TypeScript + Vitest project"
```

---

### Task 2: 型定義・初期データ・データ検証

**Files:**
- Create: `src/logic/types.ts`, `src/logic/validate.ts`, `src/data/trains.json`, `src/data/modes.json`
- Test: `tests/data.test.ts`

**Interfaces:**
- Produces:
  - `Train { id; name: {hiragana; normal}; category: Category; image; credit?; lookalikes?: string[] }`
  - `Mode { id; label: {hiragana; normal}; categories: Category[]; heroTrain }`
  - `Category = 'shinkansen' | 'express' | 'local'`
  - `Settings { notation: 'hiragana'|'normal'; questionCount: 5|7|10; sound: boolean }`
  - `validateTrains(trains: Train[]): string[]`(エラー文字列の配列、空 = OK)

- [ ] **Step 1: 型定義を作成**

`src/logic/types.ts`:
```ts
export type Category = 'shinkansen' | 'express' | 'local';

export interface TrainName {
  hiragana: string;
  normal: string;
}

export interface Credit {
  author: string;
  license: string;
  source: string;
}

export interface Train {
  id: string;
  name: TrainName;
  category: Category;
  image: string;
  credit?: Credit;
  lookalikes?: string[];
}

export interface Mode {
  id: string;
  label: TrainName;
  categories: Category[];
  heroTrain: string;
}

export type Notation = 'hiragana' | 'normal';

export interface Settings {
  notation: Notation;
  questionCount: 5 | 7 | 10;
  sound: boolean;
}
```

- [ ] **Step 2: 失敗するテストを書く**

`tests/data.test.ts`:
```ts
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
```

- [ ] **Step 3: テストが失敗することを確認**

Run: `npm test`
Expected: FAIL(`validate.ts` と JSON が存在しない)

- [ ] **Step 4: 検証ロジックとデータを実装**

`src/logic/validate.ts`:
```ts
import type { Train } from './types';

const HIRAGANA = /^[ぁ-んー ]+$/;
const CATEGORIES = new Set(['shinkansen', 'express', 'local']);

export function validateTrains(trains: Train[]): string[] {
  const errors: string[] = [];
  const byId = new Map<string, Train>();
  for (const t of trains) {
    if (byId.has(t.id)) errors.push(`重複id: ${t.id}`);
    byId.set(t.id, t);
    if (!HIRAGANA.test(t.name.hiragana)) errors.push(`ひらがな表記が不正: ${t.id}`);
    if (!CATEGORIES.has(t.category)) errors.push(`カテゴリ不正: ${t.id}`);
    if (!t.image.startsWith('images/trains/')) errors.push(`画像パス不正: ${t.id}`);
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
```

`src/data/modes.json`:
```json
[
  {
    "id": "shinkansen",
    "label": { "hiragana": "しんかんせん", "normal": "新幹線" },
    "categories": ["shinkansen"],
    "heroTrain": "images/hero/shinkansen.svg"
  },
  {
    "id": "express",
    "label": { "hiragana": "とっきゅう", "normal": "特急" },
    "categories": ["express"],
    "heroTrain": "images/hero/express.svg"
  },
  {
    "id": "local",
    "label": { "hiragana": "ふつうでんしゃ", "normal": "普通電車" },
    "categories": ["local"],
    "heroTrain": "images/hero/local.svg"
  },
  {
    "id": "all",
    "label": { "hiragana": "ぜんぶ", "normal": "ぜんぶ" },
    "categories": ["shinkansen", "express", "local"],
    "heroTrain": "images/hero/all.svg"
  }
]
```

`src/data/trains.json` — 開発用の初期12件(全件投入は Task 10。credit は Task 10 で画像と同時に付与):
```json
[
  { "id": "e5-hayabusa", "name": { "hiragana": "はやぶさ", "normal": "はやぶさ(E5系)" }, "category": "shinkansen", "image": "images/trains/e5-hayabusa.webp" },
  { "id": "e6-komachi", "name": { "hiragana": "こまち", "normal": "こまち(E6系)" }, "category": "shinkansen", "image": "images/trains/e6-komachi.webp" },
  { "id": "n700s-nozomi", "name": { "hiragana": "のぞみ", "normal": "のぞみ(N700S)" }, "category": "shinkansen", "image": "images/trains/n700s-nozomi.webp" },
  { "id": "class923-doctor-yellow", "name": { "hiragana": "どくたーいえろー", "normal": "ドクターイエロー(923形)" }, "category": "shinkansen", "image": "images/trains/class923-doctor-yellow.webp" },
  { "id": "e353-azusa", "name": { "hiragana": "あずさ", "normal": "あずさ(E353系)" }, "category": "express", "image": "images/trains/e353-azusa.webp", "lookalikes": ["e353-kaiji"] },
  { "id": "e353-kaiji", "name": { "hiragana": "かいじ", "normal": "かいじ(E353系)" }, "category": "express", "image": "images/trains/e353-kaiji.webp", "lookalikes": ["e353-azusa"] },
  { "id": "e657-hitachi", "name": { "hiragana": "ひたち", "normal": "ひたち(E657系)" }, "category": "express", "image": "images/trains/e657-hitachi.webp" },
  { "id": "883-sonic", "name": { "hiragana": "そにっく", "normal": "ソニック(883系)" }, "category": "express", "image": "images/trains/883-sonic.webp" },
  { "id": "e235-yamanote-sen", "name": { "hiragana": "やまのてせん", "normal": "山手線(E235系)" }, "category": "local", "image": "images/trains/e235-yamanote-sen.webp" },
  { "id": "e233-chuo-sen", "name": { "hiragana": "ちゅうおうせん", "normal": "中央線(E233系)" }, "category": "local", "image": "images/trains/e233-chuo-sen.webp" },
  { "id": "ef210-momotaro", "name": { "hiragana": "ももたろう", "normal": "桃太郎(EF210形・貨物)" }, "category": "local", "image": "images/trains/ef210-momotaro.webp" },
  { "id": "metro1000-ginza-sen", "name": { "hiragana": "ぎんざせん", "normal": "銀座線(東京メトロ1000系)" }, "category": "local", "image": "images/trains/metro1000-ginza-sen.webp" }
]
```

- [ ] **Step 5: テストが通ることを確認**

Run: `npm test`
Expected: PASS(全件)

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add data types, seed data, and data validation"
```

---

### Task 3: 設定モジュール(localStorage)

**Files:**
- Create: `src/logic/settings.ts`
- Test: `tests/settings.test.ts`

**Interfaces:**
- Consumes: `Settings`, `Train`, `Notation`(Task 2)
- Produces:
  - `DEFAULT_SETTINGS: Settings`(= `{ notation:'hiragana', questionCount:5, sound:true }`)
  - `loadSettings(): Settings` / `saveSettings(s: Settings): void`
  - `displayName(train: Train, notation: Notation): string`

- [ ] **Step 1: 失敗するテストを書く**

`tests/settings.test.ts`:
```ts
import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  displayName,
} from '../src/logic/settings';
import type { Train } from '../src/logic/types';

beforeEach(() => localStorage.clear());

describe('loadSettings', () => {
  it('未保存ならデフォルトを返す', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it('保存した値を復元する', () => {
    saveSettings({ notation: 'normal', questionCount: 10, sound: false });
    expect(loadSettings()).toEqual({ notation: 'normal', questionCount: 10, sound: false });
  });
  it('壊れたJSONならデフォルトを返す', () => {
    localStorage.setItem('train-quiz-settings', '{oops');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it('欠けたキーはデフォルトで補完する', () => {
    localStorage.setItem('train-quiz-settings', '{"sound":false}');
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, sound: false });
  });
});

describe('displayName', () => {
  const train: Train = {
    id: 'e5-hayabusa',
    name: { hiragana: 'はやぶさ', normal: 'はやぶさ(E5系)' },
    category: 'shinkansen',
    image: 'images/trains/e5-hayabusa.webp',
  };
  it('表記設定に応じた名前を返す', () => {
    expect(displayName(train, 'hiragana')).toBe('はやぶさ');
    expect(displayName(train, 'normal')).toBe('はやぶさ(E5系)');
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npm test`
Expected: FAIL(`settings.ts` がない)

- [ ] **Step 3: 実装**

`src/logic/settings.ts`:
```ts
import type { Settings, Train, Notation } from './types';

const STORAGE_KEY = 'train-quiz-settings';

export const DEFAULT_SETTINGS: Settings = {
  notation: 'hiragana',
  questionCount: 5,
  sound: true,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function displayName(train: Train, notation: Notation): string {
  return notation === 'hiragana' ? train.name.hiragana : train.name.normal;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add settings persistence and displayName helper"
```

---

### Task 4: クイズロジック(抽選・選択肢・スコア)

**Files:**
- Create: `src/logic/quiz.ts`
- Test: `tests/quiz.test.ts`

**Interfaces:**
- Consumes: `Train`, `Mode`, `Notation`(Task 2)、`displayName`(Task 3)
- Produces:
  - `Rng = () => number`
  - `Question { train: Train; choices: Train[]; correctIndex: number }`
  - `SessionState { questions: Question[]; current: number; score: number; failedThisQuestion: boolean; notation: Notation }`
  - `poolForMode(mode: Mode, trains: Train[]): Train[]`
  - `createSession(pool: Train[], count: number, notation: Notation, rng?: Rng): SessionState`
  - `answer(session: SessionState, choiceIndex: number): 'correct' | 'wrong'`(正解時に current を進め、初回正解のみ score++)
  - `isFinished(session: SessionState): boolean`

- [ ] **Step 1: 失敗するテストを書く**

`tests/quiz.test.ts`:
```ts
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
```

- [ ] **Step 2: 失敗を確認**

Run: `npm test`
Expected: FAIL(`quiz.ts` がない)

- [ ] **Step 3: 実装**

`src/logic/quiz.ts`:
```ts
import type { Train, Mode, Notation } from './types';
import { displayName } from './settings';

export type Rng = () => number;

export interface Question {
  train: Train;
  choices: Train[];
  correctIndex: number;
}

export interface SessionState {
  questions: Question[];
  current: number;
  score: number;
  failedThisQuestion: boolean;
  notation: Notation;
}

export function shuffle<T>(items: T[], rng: Rng): T[] {
  const a = [...items];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function pickQuestions(pool: Train[], count: number, rng: Rng): Train[] {
  return shuffle(pool, rng).slice(0, Math.min(count, pool.length));
}

function isLookalike(a: Train, b: Train): boolean {
  return (a.lookalikes ?? []).includes(b.id) || (b.lookalikes ?? []).includes(a.id);
}

export function buildChoices(
  correct: Train,
  pool: Train[],
  notation: Notation,
  rng: Rng,
): Train[] {
  const seen = new Set([displayName(correct, notation)]);
  const valid = (t: Train): boolean => {
    if (t.id === correct.id || isLookalike(t, correct)) return false;
    const name = displayName(t, notation);
    if (seen.has(name)) return false;
    seen.add(name);
    return true;
  };
  const sameCat = shuffle(
    pool.filter((t) => t.category === correct.category),
    rng,
  ).filter(valid);
  const others = shuffle(
    pool.filter((t) => t.category !== correct.category),
    rng,
  ).filter(valid);
  const distractors = [...sameCat, ...others].slice(0, 3);
  return shuffle([correct, ...distractors], rng);
}

export function poolForMode(mode: Mode, trains: Train[]): Train[] {
  return trains.filter((t) => mode.categories.includes(t.category));
}

export function createSession(
  pool: Train[],
  count: number,
  notation: Notation,
  rng: Rng = Math.random,
): SessionState {
  const questions = pickQuestions(pool, count, rng).map((train) => {
    const choices = buildChoices(train, pool, notation, rng);
    return { train, choices, correctIndex: choices.findIndex((c) => c.id === train.id) };
  });
  return { questions, current: 0, score: 0, failedThisQuestion: false, notation };
}

export type AnswerResult = 'correct' | 'wrong';

export function answer(session: SessionState, choiceIndex: number): AnswerResult {
  const q = session.questions[session.current];
  if (q.choices[choiceIndex].id === q.train.id) {
    if (!session.failedThisQuestion) session.score++;
    session.current++;
    session.failedThisQuestion = false;
    return 'correct';
  }
  session.failedThisQuestion = true;
  return 'wrong';
}

export function isFinished(session: SessionState): boolean {
  return session.current >= session.questions.length;
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: add quiz engine (question picking, choices, scoring)"
```

---

### Task 5: 画面基盤 + スタート/ゲーム選択/モード選択 + 代表電車SVG

**Files:**
- Create: `src/app.ts`, `src/ui/asset.ts`, `src/ui/longPress.ts`, `src/screens/start.ts`, `src/screens/gameSelect.ts`, `src/screens/modeSelect.ts`, `src/screens/settingsScreen.ts`(骨組み), `public/images/hero/{shinkansen,express,local,all}.svg`
- Modify: `src/main.ts`, `src/styles.css`
- Test: `tests/longPress.test.ts`

**Interfaces:**
- Consumes: Task 2〜4 の全エクスポート
- Produces:
  - `ScreenName = 'start'|'gameSelect'|'modeSelect'|'departure'|'question'|'interlude'|'arrival'|'result'|'settings'`
  - `AppContext { root; trains; modes; settings; audio: AudioPlayer; currentMode: Mode|null; session: SessionState|null; navigate(screen: ScreenName): void }`
  - `AudioPlayer { play(name: SoundName): void }` / `SoundName = 'tap'|'horn'|'wrong'|'depart'|'arrive'|'fanfare'`(この時点では no-op 実装。Task 8 で本実装)
  - `createApp(root: HTMLElement): AppContext`
  - `asset(path: string): string`(BASE_URL 前置)
  - `onLongPress(el: HTMLElement, ms: number, cb: () => void): void`
  - 画面レジストリは `Partial<Record<ScreenName, (ctx) => void>>`。後続タスクがエントリを追加する

- [ ] **Step 1: onLongPress の失敗するテストを書く**

`tests/longPress.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { onLongPress } from '../src/ui/longPress';

describe('onLongPress', () => {
  it('指定時間押し続けると発火する', () => {
    vi.useFakeTimers();
    const el = document.createElement('button');
    const cb = vi.fn();
    onLongPress(el, 3000, cb);
    el.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(3000);
    expect(cb).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
  it('途中で離すと発火しない', () => {
    vi.useFakeTimers();
    const el = document.createElement('button');
    const cb = vi.fn();
    onLongPress(el, 3000, cb);
    el.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(2999);
    el.dispatchEvent(new Event('pointerup'));
    vi.advanceTimersByTime(5000);
    expect(cb).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: ユーティリティを実装**

`src/ui/asset.ts`:
```ts
export const asset = (path: string): string => import.meta.env.BASE_URL + path;
```

`src/ui/longPress.ts`:
```ts
export function onLongPress(el: HTMLElement, ms: number, callback: () => void): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  el.addEventListener('pointerdown', () => {
    cancel();
    timer = setTimeout(() => {
      timer = null;
      callback();
    }, ms);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) {
    el.addEventListener(ev, cancel);
  }
}
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test`
Expected: PASS

- [ ] **Step 5: アプリ基盤を実装**

`src/app.ts`:
```ts
import type { Train, Mode, Settings } from './logic/types';
import type { SessionState } from './logic/quiz';
import { loadSettings } from './logic/settings';
import trainsJson from './data/trains.json';
import modesJson from './data/modes.json';
import { renderStart } from './screens/start';
import { renderGameSelect } from './screens/gameSelect';
import { renderModeSelect } from './screens/modeSelect';
import { renderSettingsScreen } from './screens/settingsScreen';

export type ScreenName =
  | 'start'
  | 'gameSelect'
  | 'modeSelect'
  | 'departure'
  | 'question'
  | 'interlude'
  | 'arrival'
  | 'result'
  | 'settings';

export type SoundName = 'tap' | 'horn' | 'wrong' | 'depart' | 'arrive' | 'fanfare';

export interface AudioPlayer {
  play(name: SoundName): void;
}

export interface AppContext {
  root: HTMLElement;
  trains: Train[];
  modes: Mode[];
  settings: Settings;
  audio: AudioPlayer;
  currentMode: Mode | null;
  session: SessionState | null;
  navigate(screen: ScreenName): void;
}

type ScreenRenderer = (ctx: AppContext) => void;

// 後続タスクの画面はここに追記していく
export const screens: Partial<Record<ScreenName, ScreenRenderer>> = {
  start: renderStart,
  gameSelect: renderGameSelect,
  modeSelect: renderModeSelect,
  settings: renderSettingsScreen,
};

export function createApp(
  root: HTMLElement,
  audio: AudioPlayer = { play: () => {} },
): AppContext {
  const ctx: AppContext = {
    root,
    trains: trainsJson as Train[],
    modes: modesJson as Mode[],
    settings: loadSettings(),
    audio,
    currentMode: null,
    session: null,
    navigate(screen) {
      const render = screens[screen];
      if (!render) throw new Error(`画面が未登録: ${screen}`);
      root.innerHTML = '';
      render(ctx);
    },
  };
  return ctx;
}
```

`src/main.ts`(置き換え):
```ts
import './styles.css';
import { createApp } from './app';

createApp(document.querySelector<HTMLElement>('#app')!).navigate('start');
```

- [ ] **Step 6: 3画面を実装**

`src/screens/start.ts`:
```ts
import type { AppContext } from '../app';
import { asset } from '../ui/asset';
import { onLongPress } from '../ui/longPress';

export function renderStart(ctx: AppContext): void {
  ctx.root.innerHTML = `
    <section class="screen screen-start">
      <h1 class="title">でんしゃクイズ</h1>
      <img class="conductor conductor-lg" src="${asset('images/conductor/normal.png')}" alt="" onerror="this.hidden=true">
      <button class="btn btn-primary" data-action="start">はじめる</button>
      <button class="gear" data-action="settings" aria-label="せってい">⚙</button>
    </section>`;
  ctx.root.querySelector<HTMLButtonElement>('[data-action=start]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    ctx.navigate('gameSelect');
  });
  onLongPress(
    ctx.root.querySelector<HTMLButtonElement>('[data-action=settings]')!,
    3000,
    () => ctx.navigate('settings'),
  );
}
```

`src/screens/gameSelect.ts`(カードは今1枚。将来 `GAMES` 配列に追加するだけで増やせる):
```ts
import type { AppContext } from '../app';
import { asset } from '../ui/asset';

const GAMES = [{ id: 'train-quiz', label: 'でんしゃクイズ', icon: 'images/hero/shinkansen.svg' }];

export function renderGameSelect(ctx: AppContext): void {
  ctx.root.innerHTML = `
    <section class="screen screen-game-select">
      <h2 class="heading">どれで あそぶ?</h2>
      <div class="card-grid">
        ${GAMES.map(
          (g) => `
          <button class="btn game-card" data-game="${g.id}">
            <img src="${asset(g.icon)}" alt="">
            <span>${g.label}</span>
          </button>`,
        ).join('')}
      </div>
      <button class="btn btn-back" data-action="back">もどる</button>
    </section>`;
  ctx.root.querySelector<HTMLButtonElement>('[data-game=train-quiz]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    ctx.navigate('modeSelect');
  });
  ctx.root.querySelector<HTMLButtonElement>('[data-action=back]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    ctx.navigate('start');
  });
}
```

`src/screens/modeSelect.ts`(遷移先の `departure` は Task 7 まで未登録。Task 6 の間だけ `question` に直行させ、Task 7 で `departure` に切り替える):
```ts
import type { AppContext } from '../app';
import { asset } from '../ui/asset';
import { createSession, poolForMode } from '../logic/quiz';

export function renderModeSelect(ctx: AppContext): void {
  ctx.root.innerHTML = `
    <section class="screen screen-mode-select">
      <h2 class="heading">どの でんしゃ で あそぶ?</h2>
      <div class="card-grid">
        ${ctx.modes
          .map(
            (m) => `
          <button class="btn mode-card" data-mode="${m.id}">
            <img src="${asset(m.heroTrain)}" alt="">
            <span>${m.label.hiragana}</span>
          </button>`,
          )
          .join('')}
      </div>
      <button class="btn btn-back" data-action="back">もどる</button>
    </section>`;
  for (const btn of ctx.root.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
    btn.addEventListener('click', () => {
      ctx.audio.play('tap');
      const mode = ctx.modes.find((m) => m.id === btn.dataset.mode)!;
      ctx.currentMode = mode;
      ctx.session = createSession(
        poolForMode(mode, ctx.trains),
        ctx.settings.questionCount,
        ctx.settings.notation,
      );
      ctx.navigate('departure');
    });
  }
  ctx.root.querySelector<HTMLButtonElement>('[data-action=back]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    ctx.navigate('gameSelect');
  });
}
```

`src/screens/settingsScreen.ts`(骨組み。設定項目は Task 9 で追加):
```ts
import type { AppContext } from '../app';

export function renderSettingsScreen(ctx: AppContext): void {
  ctx.root.innerHTML = `
    <section class="screen screen-settings">
      <h2 class="heading">せってい(おうちのひとよう)</h2>
      <button class="btn btn-back" data-action="back">もどる</button>
    </section>`;
  ctx.root.querySelector<HTMLButtonElement>('[data-action=back]')!.addEventListener('click', () => {
    ctx.navigate('start');
  });
}
```

- [ ] **Step 7: 画面スタイルを追加**

`src/styles.css` に追記:
```css
.screen {
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 24px;
  padding: 24px;
  position: relative;
}
.title { font-size: 64px; color: var(--blue-dark); }
.heading { font-size: 40px; color: var(--blue-dark); }
.btn {
  font-family: inherit;
  font-size: 32px;
  padding: 16px 40px;
  min-width: 200px;
  min-height: 88px;
  border-radius: 20px;
  border: 4px solid var(--blue-dark);
  background: #fff;
  color: var(--blue-dark);
  cursor: pointer;
}
.btn:active { transform: scale(0.97); }
.btn-primary { background: var(--blue); color: #fff; font-size: 48px; padding: 24px 64px; }
.btn-back { position: absolute; left: 24px; bottom: 24px; min-width: 140px; min-height: 72px; font-size: 26px; }
.gear {
  position: absolute;
  right: 16px;
  bottom: 16px;
  font-size: 28px;
  background: none;
  border: none;
  opacity: 0.4;
  padding: 12px;
}
.conductor-lg { height: 30vh; }
.card-grid { display: flex; flex-wrap: wrap; gap: 24px; justify-content: center; max-width: 1000px; }
.game-card, .mode-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  width: 300px;
  padding: 24px;
}
.game-card img, .mode-card img { width: 100%; height: 90px; object-fit: contain; }
```

- [ ] **Step 8: 代表電車SVGを4点作成**

`public/images/hero/shinkansen.svg`(はやぶさ・緑):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120">
  <path d="M14 92 L14 52 Q14 32 56 30 L320 30 Q378 34 392 66 L392 92 Z" fill="#f4f9f6" stroke="#2b3a42" stroke-width="4"/>
  <path d="M392 66 Q378 34 320 30 L252 30 L252 48 L388 56 Z" fill="#00a95f"/>
  <rect x="14" y="56" width="366" height="8" fill="#e4007f"/>
  <rect x="42" y="40" width="26" height="13" rx="3" fill="#3a4a55"/>
  <rect x="82" y="40" width="26" height="13" rx="3" fill="#3a4a55"/>
  <rect x="122" y="40" width="26" height="13" rx="3" fill="#3a4a55"/>
  <rect x="162" y="40" width="26" height="13" rx="3" fill="#3a4a55"/>
  <rect x="202" y="40" width="26" height="13" rx="3" fill="#3a4a55"/>
  <circle cx="80" cy="94" r="12" fill="#2b3a42"/>
  <circle cx="320" cy="94" r="12" fill="#2b3a42"/>
</svg>
```

`public/images/hero/express.svg`(あずさ・白+紫帯・平面顔):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120">
  <path d="M14 92 L14 46 Q14 30 40 30 L352 30 Q386 32 390 70 L390 92 Z" fill="#f5f4f8" stroke="#2b3a42" stroke-width="4"/>
  <path d="M390 70 Q386 34 352 30 L318 30 L318 52 L388 58 Z" fill="#3a4a55"/>
  <rect x="14" y="58" width="360" height="12" fill="#8f76d6"/>
  <rect x="44" y="40" width="28" height="14" rx="3" fill="#3a4a55"/>
  <rect x="88" y="40" width="28" height="14" rx="3" fill="#3a4a55"/>
  <rect x="132" y="40" width="28" height="14" rx="3" fill="#3a4a55"/>
  <rect x="176" y="40" width="28" height="14" rx="3" fill="#3a4a55"/>
  <rect x="220" y="40" width="28" height="14" rx="3" fill="#3a4a55"/>
  <circle cx="80" cy="94" r="12" fill="#2b3a42"/>
  <circle cx="320" cy="94" r="12" fill="#2b3a42"/>
</svg>
```

`public/images/hero/local.svg`(やまのてせん・シルバー+うぐいす帯・通勤顔):
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 120">
  <rect x="14" y="30" width="376" height="62" rx="14" fill="#e9ecef" stroke="#2b3a42" stroke-width="4"/>
  <rect x="330" y="36" width="54" height="30" rx="6" fill="#3a4a55"/>
  <rect x="14" y="66" width="376" height="14" fill="#9acd32"/>
  <rect x="40" y="40" width="40" height="20" rx="4" fill="#3a4a55"/>
  <rect x="100" y="40" width="40" height="20" rx="4" fill="#3a4a55"/>
  <rect x="160" y="40" width="40" height="20" rx="4" fill="#3a4a55"/>
  <rect x="220" y="40" width="40" height="20" rx="4" fill="#3a4a55"/>
  <rect x="280" y="40" width="36" height="20" rx="4" fill="#3a4a55"/>
  <circle cx="80" cy="94" r="12" fill="#2b3a42"/>
  <circle cx="320" cy="94" r="12" fill="#2b3a42"/>
</svg>
```

`public/images/hero/all.svg` は はやぶさ と同じ:
```bash
cp public/images/hero/shinkansen.svg public/images/hero/all.svg
```

- [ ] **Step 9: 型チェックと手動確認**

Run: `npm run build && npm test`
Expected: PASS(モード選択→departure は未登録なのでタップするとエラーになるが、それは Task 6/7 で解消する。ここでは スタート→ゲーム選択→モード選択 の表示と、歯車3秒長押しで設定画面が開くことを `npm run dev` で確認)

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "feat: add app shell, start/game/mode screens, hero SVGs"
```

---

### Task 6: 問題画面(正誤演出・再挑戦・進捗バー)+ ホーム背景

**Files:**
- Create: `src/screens/question.ts`, `public/images/bg/platform.svg`
- Modify: `src/app.ts`(screens に question を追加)、`src/styles.css`
- Test: `tests/question.test.ts`

**Interfaces:**
- Consumes: `AppContext`(Task 5)、`answer`/`isFinished`(Task 4)、`displayName`(Task 3)
- Produces: `renderQuestion(ctx: AppContext): void`。正解→1.5秒後に `interlude`(最終問題なら `arrival`)へ navigate。不正解→1.5秒後にオーバーレイを閉じ、押したボタンを `disabled` + `.choice-used` にして同じ問題を継続

- [ ] **Step 1: 失敗するテストを書く**

`tests/question.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderQuestion } from '../src/screens/question';
import { createSession } from '../src/logic/quiz';
import type { AppContext } from '../src/app';
import type { Train, Mode } from '../src/logic/types';

function train(id: string, hiragana: string): Train {
  return {
    id,
    name: { hiragana, normal: hiragana },
    category: 'local',
    image: `images/trains/${id}.webp`,
  };
}

const mode: Mode = {
  id: 'local',
  label: { hiragana: 'ふつうでんしゃ', normal: '普通電車' },
  categories: ['local'],
  heroTrain: 'images/hero/local.svg',
};

function fixtureCtx(questionCount: number): AppContext {
  const trains = [
    train('a', 'やまのてせん'),
    train('b', 'ちゅうおうせん'),
    train('c', 'えのでん'),
    train('d', 'ぎんざせん'),
    train('e', 'ももたろう'),
  ];
  const ctx = {
    root: document.createElement('div'),
    trains,
    modes: [mode],
    settings: { notation: 'hiragana', questionCount: 5, sound: false },
    audio: { play: vi.fn() },
    currentMode: mode,
    session: createSession(trains, questionCount, 'hiragana', () => 0.42),
    navigate: vi.fn(),
  } as unknown as AppContext;
  document.body.appendChild(ctx.root);
  return ctx;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('renderQuestion', () => {
  it('不正解タップ: 同じ問題のまま、押したボタンだけ無効化される', () => {
    const ctx = fixtureCtx(2);
    renderQuestion(ctx);
    const q = ctx.session!.questions[0];
    const wrongIndex = q.correctIndex === 0 ? 1 : 0;
    const buttons = [...ctx.root.querySelectorAll<HTMLButtonElement>('.choice')];
    buttons[wrongIndex].click();
    expect(ctx.root.querySelector<HTMLElement>('.overlay')!.hidden).toBe(false);
    expect(ctx.root.querySelector('.verdict')!.textContent).toBe('もういっかい');
    vi.advanceTimersByTime(1500);
    expect(ctx.root.querySelector<HTMLElement>('.overlay')!.hidden).toBe(true);
    expect(buttons[wrongIndex].disabled).toBe(true);
    expect(buttons[q.correctIndex].disabled).toBe(false);
    expect(ctx.navigate).not.toHaveBeenCalled();
  });

  it('正解タップ: 次の問題があれば interlude へ', () => {
    const ctx = fixtureCtx(2);
    renderQuestion(ctx);
    const q = ctx.session!.questions[0];
    const buttons = [...ctx.root.querySelectorAll<HTMLButtonElement>('.choice')];
    buttons[q.correctIndex].click();
    expect(ctx.root.querySelector('.verdict')!.textContent).toBe('せいかい');
    vi.advanceTimersByTime(1500);
    expect(ctx.navigate).toHaveBeenCalledWith('interlude');
  });

  it('最終問題の正解: arrival へ', () => {
    const ctx = fixtureCtx(1);
    renderQuestion(ctx);
    const q = ctx.session!.questions[0];
    const buttons = [...ctx.root.querySelectorAll<HTMLButtonElement>('.choice')];
    buttons[q.correctIndex].click();
    vi.advanceTimersByTime(1500);
    expect(ctx.navigate).toHaveBeenCalledWith('arrival');
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npm test`
Expected: FAIL(`question.ts` がない)

- [ ] **Step 3: 問題画面を実装**

`src/screens/question.ts`:
```ts
import type { AppContext } from '../app';
import { answer, isFinished } from '../logic/quiz';
import { displayName } from '../logic/settings';
import { asset } from '../ui/asset';

const FEEDBACK_MS = 1500;

export function renderQuestion(ctx: AppContext): void {
  const session = ctx.session!;
  const q = session.questions[session.current];
  const total = session.questions.length;

  ctx.root.innerHTML = `
    <section class="screen screen-question platform-bg"
             style="background-image:url(${asset('images/bg/platform.svg')})">
      <div class="progress">
        ${Array.from({ length: total }, (_, i) => `<span class="station${i <= session.current ? ' passed' : ''}"></span>`).join('')}
        <img class="progress-train" style="left:${(session.current / Math.max(total - 1, 1)) * 88}%"
             src="${asset(ctx.currentMode!.heroTrain)}" alt="">
      </div>
      <figure class="photo-card">
        <img src="${asset(q.train.image)}" alt="でんしゃのしゃしん">
      </figure>
      <div class="choices">
        ${q.choices
          .map((c, i) => `<button class="btn choice" data-index="${i}">${displayName(c, session.notation)}</button>`)
          .join('')}
      </div>
      <div class="overlay" hidden>
        <div class="mark"></div>
        <div class="verdict"></div>
        <img class="conductor" alt="" onerror="this.hidden=true">
      </div>
    </section>`;

  const overlay = ctx.root.querySelector<HTMLElement>('.overlay')!;
  const mark = overlay.querySelector<HTMLElement>('.mark')!;
  const verdict = overlay.querySelector<HTMLElement>('.verdict')!;
  const conductor = overlay.querySelector<HTMLImageElement>('.conductor')!;
  const buttons = [...ctx.root.querySelectorAll<HTMLButtonElement>('.choice')];

  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      const result = answer(session, Number(btn.dataset.index));
      for (const b of buttons) b.disabled = true;
      conductor.hidden = false;
      if (result === 'correct') {
        ctx.audio.play('horn');
        mark.textContent = '◯';
        mark.className = 'mark mark-correct';
        verdict.textContent = 'せいかい';
        conductor.src = asset('images/conductor/happy.png');
        overlay.hidden = false;
        setTimeout(() => ctx.navigate(isFinished(session) ? 'arrival' : 'interlude'), FEEDBACK_MS);
      } else {
        ctx.audio.play('wrong');
        mark.textContent = '✕';
        mark.className = 'mark mark-wrong';
        verdict.textContent = 'もういっかい';
        conductor.src = asset('images/conductor/sad.png');
        overlay.hidden = false;
        setTimeout(() => {
          overlay.hidden = true;
          btn.classList.add('choice-used');
          for (const b of buttons) {
            if (!b.classList.contains('choice-used')) b.disabled = false;
          }
        }, FEEDBACK_MS);
      }
    });
  }
}
```

`src/app.ts` に追記(import と screens エントリ):
```ts
import { renderQuestion } from './screens/question';
// screens に追加:
//   question: renderQuestion,
```

さらに、Task 7 まで通しで遊べるように `src/screens/modeSelect.ts` の `ctx.navigate('departure')` を一時的に `ctx.navigate('question')` に変更する(Task 7 で戻す)。

- [ ] **Step 4: ホーム背景SVGとスタイルを追加**

`public/images/bg/platform.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 900" preserveAspectRatio="xMidYMax slice">
  <rect width="1600" height="900" fill="#cfe9f7"/>
  <circle cx="1360" cy="120" r="60" fill="#ffd54d"/>
  <rect y="180" width="1600" height="36" fill="#5f6a72"/>
  <rect x="180" y="216" width="22" height="420" fill="#7c8790"/>
  <rect x="700" y="216" width="22" height="420" fill="#7c8790"/>
  <rect x="1220" y="216" width="22" height="420" fill="#7c8790"/>
  <rect x="640" y="300" width="220" height="76" rx="10" fill="#fff" stroke="#3a4a55" stroke-width="4"/>
  <text x="750" y="352" font-size="40" text-anchor="middle" fill="#3a4a55">えき</text>
  <rect y="636" width="1600" height="20" fill="#f2c200"/>
  <rect y="656" width="1600" height="60" fill="#b9bec4"/>
  <rect y="716" width="1600" height="184" fill="#8d9298"/>
</svg>
```

`src/styles.css` に追記:
```css
.platform-bg { background-size: cover; background-position: bottom center; background-repeat: no-repeat; }
.screen-question { justify-content: flex-start; gap: 12px; padding-top: 12px; }
.progress {
  position: relative;
  width: min(90%, 800px);
  height: 56px;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  border-bottom: 6px solid #5f6a72;
  padding: 0 4%;
}
.station { width: 18px; height: 18px; border-radius: 50%; background: #fff; border: 4px solid #5f6a72; margin-bottom: -12px; }
.station.passed { background: var(--blue); }
.progress-train { position: absolute; bottom: 8px; height: 36px; transition: left 0.4s; }
.photo-card { background: #fff; padding: 10px; border-radius: 16px; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2); }
.photo-card img { display: block; max-height: 38vh; max-width: 80vw; border-radius: 8px; }
.choices { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; width: min(92%, 900px); }
.choice { font-size: 36px; min-height: 92px; }
.choice-used { opacity: 0.35; }
.overlay {
  position: fixed;
  inset: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 10;
}
.mark { font-size: 200px; line-height: 1; font-weight: bold; }
.mark-correct { color: var(--red); }
.mark-wrong { color: var(--blue); }
.verdict { font-size: 56px; color: #333; }
.overlay .conductor { height: 24vh; }
```

- [ ] **Step 5: テストが通ることを確認**

Run: `npm test && npm run build`
Expected: PASS。`npm run dev` でモード選択→問題画面→正誤演出→(interlude未登録エラーは Task 7 で解消)まで目視確認

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add question screen with feedback overlay, retry, progress bar"
```

---

### Task 7: 走行演出(出発/幕間/到着)+ 結果画面

**Files:**
- Create: `src/screens/travel.ts`, `src/screens/result.ts`
- Modify: `src/app.ts`(departure/interlude/arrival/result を登録)、`src/screens/modeSelect.ts`(`question` → `departure` に戻す)、`src/styles.css`
- Test: `tests/travel.test.ts`, `tests/result.test.ts`

**Interfaces:**
- Consumes: `AppContext`(Task 5)、`createSession`/`poolForMode`(Task 4)
- Produces: `renderDeparture` / `renderInterlude` / `renderArrival` / `renderResult`。departure=3000ms→question、interlude=2000ms→question、arrival=2500ms→result。いずれもタップで即遷移(スキップ)

- [ ] **Step 1: 失敗するテストを書く**

`tests/travel.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderInterlude, renderDeparture } from '../src/screens/travel';
import type { AppContext } from '../src/app';
import type { Mode } from '../src/logic/types';

const mode: Mode = {
  id: 'shinkansen',
  label: { hiragana: 'しんかんせん', normal: '新幹線' },
  categories: ['shinkansen'],
  heroTrain: 'images/hero/shinkansen.svg',
};

function fixtureCtx(): AppContext {
  return {
    root: document.createElement('div'),
    trains: [],
    modes: [mode],
    settings: { notation: 'hiragana', questionCount: 5, sound: false },
    audio: { play: vi.fn() },
    currentMode: mode,
    session: null,
    navigate: vi.fn(),
  } as unknown as AppContext;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('travel screens', () => {
  it('interlude は2秒後に question へ', () => {
    const ctx = fixtureCtx();
    renderInterlude(ctx);
    vi.advanceTimersByTime(2000);
    expect(ctx.navigate).toHaveBeenCalledWith('question');
  });
  it('タップでスキップでき、二重遷移しない', () => {
    const ctx = fixtureCtx();
    renderDeparture(ctx);
    ctx.root.querySelector<HTMLElement>('.screen')!.click();
    expect(ctx.navigate).toHaveBeenCalledTimes(1);
    expect(ctx.navigate).toHaveBeenCalledWith('question');
    vi.advanceTimersByTime(5000);
    expect(ctx.navigate).toHaveBeenCalledTimes(1);
  });
});
```

`tests/result.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { renderResult } from '../src/screens/result';
import { createSession, answer } from '../src/logic/quiz';
import type { AppContext } from '../src/app';
import type { Train, Mode } from '../src/logic/types';

function train(id: string, hiragana: string): Train {
  return {
    id,
    name: { hiragana, normal: hiragana },
    category: 'local',
    image: `images/trains/${id}.webp`,
  };
}

const mode: Mode = {
  id: 'local',
  label: { hiragana: 'ふつうでんしゃ', normal: '普通電車' },
  categories: ['local'],
  heroTrain: 'images/hero/local.svg',
};

function fixtureCtx(): AppContext {
  const trains = [
    train('a', 'やまのてせん'),
    train('b', 'ちゅうおうせん'),
    train('c', 'えのでん'),
    train('d', 'ぎんざせん'),
  ];
  const session = createSession(trains, 2, 'hiragana', () => 0.3);
  // 1問目: 一発正解 / 2問目: 一発正解 → パーフェクト
  answer(session, session.questions[0].correctIndex);
  answer(session, session.questions[1].correctIndex);
  return {
    root: document.createElement('div'),
    trains,
    modes: [mode],
    settings: { notation: 'hiragana', questionCount: 5, sound: false },
    audio: { play: vi.fn() },
    currentMode: mode,
    session,
    navigate: vi.fn(),
  } as unknown as AppContext;
}

describe('renderResult', () => {
  it('スコアとはなまる(パーフェクト時)を表示する', () => {
    const ctx = fixtureCtx();
    renderResult(ctx);
    expect(ctx.root.querySelector('.result-score')!.textContent).toContain('2もんちゅう 2もん せいかい');
    expect(ctx.root.querySelector('.hanamaru')).not.toBeNull();
  });
  it('「もういちど」で新しいセッションを作って departure へ', () => {
    const ctx = fixtureCtx();
    const oldSession = ctx.session;
    renderResult(ctx);
    ctx.root.querySelector<HTMLButtonElement>('[data-action=retry]')!.click();
    expect(ctx.session).not.toBe(oldSession);
    expect(ctx.session!.current).toBe(0);
    expect(ctx.navigate).toHaveBeenCalledWith('departure');
  });
  it('「もどる」で modeSelect へ', () => {
    const ctx = fixtureCtx();
    renderResult(ctx);
    ctx.root.querySelector<HTMLButtonElement>('[data-action=back]')!.click();
    expect(ctx.navigate).toHaveBeenCalledWith('modeSelect');
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: 走行演出を実装**

`src/screens/travel.ts`:
```ts
import type { AppContext, ScreenName } from '../app';
import { asset } from '../ui/asset';

interface TravelOptions {
  variant: 'depart' | 'run' | 'arrive';
  label: string;
  durationMs: number;
  next: ScreenName;
}

function playTravel(ctx: AppContext, opts: TravelOptions): void {
  ctx.root.innerHTML = `
    <section class="screen screen-travel travel-${opts.variant} platform-bg"
             style="background-image:url(${asset('images/bg/platform.svg')})">
      ${opts.label ? `<div class="travel-label">${opts.label}</div>` : ''}
      <img class="travel-train" src="${asset(ctx.currentMode!.heroTrain)}" alt="">
    </section>`;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    ctx.navigate(opts.next);
  };
  const timer = setTimeout(finish, opts.durationMs);
  ctx.root.querySelector<HTMLElement>('.screen')!.addEventListener('click', finish);
}

export function renderDeparture(ctx: AppContext): void {
  ctx.audio.play('depart');
  playTravel(ctx, { variant: 'depart', label: 'しゅっぱつ!', durationMs: 3000, next: 'question' });
}

export function renderInterlude(ctx: AppContext): void {
  playTravel(ctx, { variant: 'run', label: '', durationMs: 2000, next: 'question' });
}

export function renderArrival(ctx: AppContext): void {
  ctx.audio.play('arrive');
  playTravel(ctx, { variant: 'arrive', label: 'とうちゃく!', durationMs: 2500, next: 'result' });
}
```

- [ ] **Step 4: 結果画面を実装**

`src/screens/result.ts`:
```ts
import type { AppContext } from '../app';
import { createSession, poolForMode } from '../logic/quiz';
import { asset } from '../ui/asset';

export function renderResult(ctx: AppContext): void {
  const session = ctx.session!;
  const total = session.questions.length;
  const perfect = session.score === total;
  ctx.audio.play('fanfare');
  ctx.root.innerHTML = `
    <section class="screen screen-result platform-bg"
             style="background-image:url(${asset('images/bg/platform.svg')})">
      <div class="doors"><div class="door door-left"></div><div class="door door-right"></div></div>
      <div class="result-body">
        <img class="conductor conductor-lg" src="${asset('images/conductor/celebrate.png')}" alt="" onerror="this.hidden=true">
        <p class="result-score">${total}もんちゅう ${session.score}もん せいかい!</p>
        ${perfect ? '<p class="hanamaru">💮 ぜんぶ いっぱつ せいかい!</p>' : ''}
        <div class="result-actions">
          <button class="btn" data-action="retry">もういちど</button>
          <button class="btn" data-action="back">もどる</button>
        </div>
      </div>
    </section>`;
  requestAnimationFrame(() => ctx.root.querySelector('.doors')!.classList.add('open'));
  ctx.root.querySelector<HTMLButtonElement>('[data-action=retry]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    ctx.session = createSession(
      poolForMode(ctx.currentMode!, ctx.trains),
      ctx.settings.questionCount,
      ctx.settings.notation,
    );
    ctx.navigate('departure');
  });
  ctx.root.querySelector<HTMLButtonElement>('[data-action=back]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    ctx.navigate('modeSelect');
  });
}
```

- [ ] **Step 5: 画面登録とスタイル**

`src/app.ts` の screens に追記(import も追加):
```ts
import { renderDeparture, renderInterlude, renderArrival } from './screens/travel';
import { renderResult } from './screens/result';
// screens に追加:
//   departure: renderDeparture,
//   interlude: renderInterlude,
//   arrival: renderArrival,
//   result: renderResult,
```

`src/screens/modeSelect.ts` の一時変更を戻す: `ctx.navigate('question')` → `ctx.navigate('departure')`

`src/styles.css` に追記:
```css
.screen-travel { overflow: hidden; }
.travel-label { font-size: 72px; color: var(--blue-dark); text-shadow: 0 2px 0 #fff; z-index: 2; }
.travel-train { position: absolute; bottom: 22%; width: 380px; left: -30%; }
.travel-depart .travel-train { animation: travel-depart 3s ease-in forwards; }
.travel-run .travel-train { animation: travel-run 2s linear forwards; }
.travel-arrive .travel-train { animation: travel-arrive 2.5s ease-out forwards; }
@keyframes travel-depart { from { left: 20%; } to { left: 120%; } }
@keyframes travel-run { from { left: -30%; } to { left: 120%; } }
@keyframes travel-arrive { from { left: -30%; } to { left: 25%; } }
.doors { position: fixed; inset: 0; display: flex; z-index: 5; pointer-events: none; }
.door { flex: 1; background: #74b0d8; border: 6px solid #4a90b8; transition: transform 1s ease 0.3s; }
.doors.open .door-left { transform: translateX(-105%); }
.doors.open .door-right { transform: translateX(105%); }
.result-body { display: flex; flex-direction: column; align-items: center; gap: 16px; }
.result-score { font-size: 52px; color: var(--blue-dark); }
.hanamaru { font-size: 44px; color: var(--red); }
.result-actions { display: flex; gap: 24px; }
```

- [ ] **Step 6: テストが通ることを確認**

Run: `npm test && npm run build`
Expected: PASS。`npm run dev` で スタート→…→出発演出→問題→幕間→…→到着→ドアが開いて結果→もういちど/もどる の全フローを目視確認

- [ ] **Step 7: Commit**

```bash
git add -A
git commit -m "feat: add travel animations and result screen with door reveal"
```

---

### Task 8: 効果音(生成スクリプト+プレイヤー)

**Files:**
- Create: `scripts/make-sounds.mjs`, `src/audio.ts`, `public/sounds/*.wav`(スクリプトで生成)
- Modify: `src/main.ts`(本物の AudioPlayer を接続)、`package.json`(`"sounds"` スクリプト追加)
- Test: `tests/audio.test.ts`

**Interfaces:**
- Consumes: `Settings`(Task 2)、`AudioPlayer`/`SoundName`(Task 5)
- Produces: `initAudio(getSettings: () => Settings, AudioCtor?: typeof Audio): AudioPlayer`。`sound: false` なら再生しない。初回 pointerdown で全要素をアンロック(iOS対策)

- [ ] **Step 1: 効果音生成スクリプトを作成**

`scripts/make-sounds.mjs`(依存なし・WAV直書き。あとで効果音ラボ等の音源に同名ファイルで差し替え可能):
```js
import { writeFileSync, mkdirSync } from 'node:fs';

const RATE = 22050;

function wav(samples) {
  const data = Buffer.alloc(samples.length * 2);
  samples.forEach((s, i) => data.writeInt16LE((Math.max(-1, Math.min(1, s)) * 32767) | 0, i * 2));
  const h = Buffer.alloc(44);
  h.write('RIFF', 0);
  h.writeUInt32LE(36 + data.length, 4);
  h.write('WAVEfmt ', 8);
  h.writeUInt32LE(16, 16);
  h.writeUInt16LE(1, 20);
  h.writeUInt16LE(1, 22);
  h.writeUInt32LE(RATE, 24);
  h.writeUInt32LE(RATE * 2, 28);
  h.writeUInt16LE(2, 32);
  h.writeUInt16LE(16, 34);
  h.write('data', 36);
  h.writeUInt32LE(data.length, 40);
  return Buffer.concat([h, data]);
}

function tone(freqs, dur, { gain = 0.5, decay = 4 } = {}) {
  const n = Math.floor(RATE * dur);
  return Array.from({ length: n }, (_, i) => {
    const t = i / RATE;
    const env = Math.exp(-decay * t) * Math.min(1, i / 200);
    return (freqs.reduce((sum, f) => sum + Math.sin(2 * Math.PI * f * t), 0) / freqs.length) * gain * env;
  });
}

const silence = (dur) => new Array(Math.floor(RATE * dur)).fill(0);

const sounds = {
  tap: tone([880], 0.08, { decay: 20 }),
  horn: tone([311, 415], 0.8, { decay: 1.2, gain: 0.6 }),
  wrong: [...tone([220], 0.15, { decay: 6 }), ...silence(0.05), ...tone([180], 0.3, { decay: 6 })],
  depart: [...tone([660], 0.12, { decay: 8 }), ...tone([784], 0.12, { decay: 8 }), ...tone([880], 0.3, { decay: 4 })],
  arrive: [...tone([880], 0.15, { decay: 6 }), ...tone([660], 0.35, { decay: 4 })],
  fanfare: [
    ...tone([523], 0.15, { decay: 5 }),
    ...tone([659], 0.15, { decay: 5 }),
    ...tone([784], 0.15, { decay: 5 }),
    ...tone([1047, 784], 0.5, { decay: 3 }),
  ],
};

mkdirSync('public/sounds', { recursive: true });
for (const [name, samples] of Object.entries(sounds)) {
  writeFileSync(`public/sounds/${name}.wav`, wav(samples));
}
console.log('generated:', Object.keys(sounds).join(', '));
```

`package.json` の scripts に追加: `"sounds": "node scripts/make-sounds.mjs"`

Run: `npm run sounds`
Expected: `public/sounds/` に6ファイル生成

- [ ] **Step 2: 失敗するテストを書く**

`tests/audio.test.ts`:
```ts
import { describe, it, expect, vi } from 'vitest';
import { initAudio } from '../src/audio';
import type { Settings } from '../src/logic/types';

class FakeAudio {
  static instances: FakeAudio[] = [];
  src: string;
  currentTime = 0;
  muted = false;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }
}

function makeSettings(sound: boolean): Settings {
  return { notation: 'hiragana', questionCount: 5, sound };
}

describe('initAudio', () => {
  it('sound=true なら play が呼ばれる', () => {
    FakeAudio.instances = [];
    const player = initAudio(() => makeSettings(true), FakeAudio as unknown as typeof Audio);
    player.play('horn');
    const horn = FakeAudio.instances.find((a) => a.src.includes('horn'));
    expect(horn!.play).toHaveBeenCalled();
  });
  it('sound=false なら再生しない', () => {
    FakeAudio.instances = [];
    const player = initAudio(() => makeSettings(false), FakeAudio as unknown as typeof Audio);
    player.play('horn');
    for (const a of FakeAudio.instances) expect(a.play).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: 失敗を確認**

Run: `npm test`
Expected: FAIL(`audio.ts` がない)

- [ ] **Step 4: プレイヤーを実装して接続**

`src/audio.ts`:
```ts
import type { Settings } from './logic/types';
import type { AudioPlayer, SoundName } from './app';
import { asset } from './ui/asset';

const NAMES: SoundName[] = ['tap', 'horn', 'wrong', 'depart', 'arrive', 'fanfare'];

export function initAudio(
  getSettings: () => Settings,
  AudioCtor: typeof Audio = Audio,
): AudioPlayer {
  const elements = new Map<SoundName, HTMLAudioElement>();
  for (const name of NAMES) {
    elements.set(name, new AudioCtor(asset(`sounds/${name}.wav`)));
  }
  // iOS Safari: 最初のタップで全要素を一度再生してアンロック
  const unlock = () => {
    for (const el of elements.values()) {
      el.muted = true;
      el.play()
        .then(() => {
          el.pause();
          el.currentTime = 0;
          el.muted = false;
        })
        .catch(() => {
          el.muted = false;
        });
    }
    document.removeEventListener('pointerdown', unlock);
  };
  document.addEventListener('pointerdown', unlock);

  return {
    play(name) {
      if (!getSettings().sound) return;
      const el = elements.get(name)!;
      el.currentTime = 0;
      void el.play().catch(() => {});
    },
  };
}
```

`src/main.ts`(置き換え):
```ts
import './styles.css';
import { createApp } from './app';
import { initAudio } from './audio';

const root = document.querySelector<HTMLElement>('#app')!;
const app = createApp(root, initAudio(() => app.settings));
app.navigate('start');
```

- [ ] **Step 5: テストが通ることを確認**

Run: `npm test && npm run build`
Expected: PASS。`npm run dev` で正解時「ファーン」等が鳴ることを確認

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: add sound synthesis script and audio player with iOS unlock"
```

---

### Task 9: 設定画面(表記・問題数・音・クレジット)

**Files:**
- Modify: `src/screens/settingsScreen.ts`(骨組み→本実装)、`src/styles.css`
- Test: `tests/settingsScreen.test.ts`

**Interfaces:**
- Consumes: `AppContext`(Task 5)、`saveSettings`/`loadSettings`(Task 3)
- Produces: 変更即保存の設定画面。クレジットは `ctx.trains` の `credit` があるものを一覧表示

- [ ] **Step 1: 失敗するテストを書く**

`tests/settingsScreen.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderSettingsScreen } from '../src/screens/settingsScreen';
import { loadSettings, DEFAULT_SETTINGS } from '../src/logic/settings';
import type { AppContext } from '../src/app';

function fixtureCtx(): AppContext {
  return {
    root: document.createElement('div'),
    trains: [
      {
        id: 'a',
        name: { hiragana: 'あずさ', normal: 'あずさ(E353系)' },
        category: 'express',
        image: 'images/trains/a.webp',
        credit: { author: 'Taro', license: 'CC BY-SA 4.0', source: 'https://example.com/a' },
      },
    ],
    modes: [],
    settings: { ...DEFAULT_SETTINGS },
    audio: { play: vi.fn() },
    currentMode: null,
    session: null,
    navigate: vi.fn(),
  } as unknown as AppContext;
}

beforeEach(() => localStorage.clear());

describe('renderSettingsScreen', () => {
  it('問題数を変更すると即保存される', () => {
    const ctx = fixtureCtx();
    renderSettingsScreen(ctx);
    const radio = ctx.root.querySelector<HTMLInputElement>('input[name=count][value="10"]')!;
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    expect(ctx.settings.questionCount).toBe(10);
    expect(loadSettings().questionCount).toBe(10);
  });
  it('表記を変更すると即保存される', () => {
    const ctx = fixtureCtx();
    renderSettingsScreen(ctx);
    const radio = ctx.root.querySelector<HTMLInputElement>('input[name=notation][value=normal]')!;
    radio.checked = true;
    radio.dispatchEvent(new Event('change', { bubbles: true }));
    expect(loadSettings().notation).toBe('normal');
  });
  it('クレジット一覧に撮影者とライセンスが出る', () => {
    const ctx = fixtureCtx();
    renderSettingsScreen(ctx);
    const credits = ctx.root.querySelector('.credits')!.textContent!;
    expect(credits).toContain('Taro');
    expect(credits).toContain('CC BY-SA 4.0');
  });
});
```

- [ ] **Step 2: 失敗を確認**

Run: `npm test`
Expected: FAIL

- [ ] **Step 3: 実装**

`src/screens/settingsScreen.ts`(置き換え):
```ts
import type { AppContext } from '../app';
import { saveSettings } from '../logic/settings';

export function renderSettingsScreen(ctx: AppContext): void {
  const s = ctx.settings;
  const credits = ctx.trains.filter((t) => t.credit);
  ctx.root.innerHTML = `
    <section class="screen screen-settings">
      <h2 class="heading">せってい(おうちのひとよう)</h2>
      <div class="setting-row">
        <span class="setting-label">もじ</span>
        <label><input type="radio" name="notation" value="hiragana" ${s.notation === 'hiragana' ? 'checked' : ''}> ひらがな</label>
        <label><input type="radio" name="notation" value="normal" ${s.notation === 'normal' ? 'checked' : ''}> ふつう</label>
      </div>
      <div class="setting-row">
        <span class="setting-label">もんだいのかず</span>
        ${[5, 7, 10]
          .map(
            (n) =>
              `<label><input type="radio" name="count" value="${n}" ${s.questionCount === n ? 'checked' : ''}> ${n}もん</label>`,
          )
          .join('')}
      </div>
      <div class="setting-row">
        <span class="setting-label">おと</span>
        <label><input type="checkbox" name="sound" ${s.sound ? 'checked' : ''}> オン</label>
      </div>
      <details class="credits">
        <summary>しゃしんのクレジット(${credits.length}けん)</summary>
        <ul>
          ${credits
            .map(
              (t) =>
                `<li>${t.name.normal} — ${t.credit!.author}(${t.credit!.license})<a href="${t.credit!.source}" target="_blank" rel="noreferrer">出典</a></li>`,
            )
            .join('')}
        </ul>
      </details>
      <button class="btn btn-back" data-action="back">もどる</button>
    </section>`;

  ctx.root.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (input.name === 'notation') ctx.settings.notation = input.value as 'hiragana' | 'normal';
    if (input.name === 'count') ctx.settings.questionCount = Number(input.value) as 5 | 7 | 10;
    if (input.name === 'sound') ctx.settings.sound = input.checked;
    saveSettings(ctx.settings);
  });
  ctx.root.querySelector<HTMLButtonElement>('[data-action=back]')!.addEventListener('click', () => {
    ctx.navigate('start');
  });
}
```

`src/styles.css` に追記:
```css
.screen-settings { justify-content: flex-start; padding-top: 48px; align-items: flex-start; max-width: 800px; margin: 0 auto; }
.setting-row { display: flex; align-items: center; gap: 24px; font-size: 28px; }
.setting-label { min-width: 220px; font-weight: bold; color: var(--blue-dark); }
.setting-row input { width: 28px; height: 28px; }
.credits { font-size: 18px; max-height: 30vh; overflow-y: auto; -webkit-user-select: text; user-select: text; }
.credits li { margin: 6px 0; }
```

- [ ] **Step 4: テストが通ることを確認**

Run: `npm test && npm run build`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add -A
git commit -m "feat: implement parent settings screen with photo credits"
```

---

### Task 10: 全電車データ投入 + 写真収集パイプライン

**Files:**
- Create: `scripts/convert-images.mjs`, `scripts/validate-data.mjs`, `docs/image-sourcing.md`, `public/images/trains/*.webp`
- Modify: `src/data/trains.json`(全件)、`package.json`(scripts 追加)

**Interfaces:**
- Consumes: 仕様書 §6 のラインナップ表(しんかんせん18 / とっきゅう63 / ふつうでんしゃ37)
- Produces: 画像が確保できた全電車の `trains.json`(credit 付き)と `public/images/trains/*.webp`

**id命名規則:** `<形式スラッグ>-<名前のヘボン式ローマ字(kebab-case)>`。例: `e5-hayabusa`, `h5-hayabusa`, `kiha261-soya`, `225-hanwa-sen`, `n700s-nozomi`, `metro1000-ginza-sen`, `d51-degoichi`。形式が不明瞭なものは会社名スラッグで代用(例: `hankyu1000-hankyu-dentetsu`)。

**lookalikes 登録(相互に):**
- `e5-hayabusa` ⇔ `h5-hayabusa`
- `e2-hayate` ⇔ `e2-toki`
- `n700-mizuho` ⇔ `n700-sakura`
- `e353-azusa` ⇔ `e353-kaiji`
- `kiha261-soya` ⇔ `kiha261-super-tokachi` ⇔ `kiha261-ozora`(3つ相互)
- `kiha283-okhotsk` ⇔ `kiha283-super-ozora`
- `2700-uzushio` ⇔ `2700-nanpu`
- `225-hanwa-sen` ⇔ `225-shin-kaisoku`

- [ ] **Step 1: 変換・検証スクリプトを作成**

`scripts/convert-images.mjs`:
```js
import sharp from 'sharp';
import { readdirSync, mkdirSync } from 'node:fs';
import path from 'node:path';

const SRC = 'assets-src/trains';
const OUT = 'public/images/trains';
mkdirSync(OUT, { recursive: true });
for (const file of readdirSync(SRC)) {
  const id = path.parse(file).name;
  await sharp(path.join(SRC, file))
    .rotate()
    .resize({ width: 800, withoutEnlargement: true })
    .webp({ quality: 78 })
    .toFile(path.join(OUT, `${id}.webp`));
  console.log('converted:', id);
}
```

`scripts/validate-data.mjs`:
```js
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
```

`package.json` の scripts に追加:
```json
"images": "node scripts/convert-images.mjs",
"validate": "node scripts/validate-data.mjs"
```

Run: `npm install -D sharp`

- [ ] **Step 2: 収集手順書を作成**

`docs/image-sourcing.md`:
```markdown
# 写真収集の手順

1. 対象: `docs/superpowers/specs/2026-08-31-train-quiz-design.md` §6 の全電車
2. Wikimedia Commons で「<形式名> <愛称>」で検索(例: "E353系 あずさ")
   - 優先ライセンス: CC0 / CC BY / CC BY-SA(GFDLのみは避ける)
   - 構図: 先頭車両が大きく写った編成写真。行き先表示で lookalike と区別できるものを優先
3. 原本を `assets-src/trains/<id>.<拡張子>` で保存(idは trains.json と一致させる)
4. `trains.json` の該当エントリに credit を記入:
   { "author": "<撮影者名>", "license": "<ライセンス名>", "source": "<ファイルページURL>" }
5. `npm run images` で WebP 変換 → `npm run validate` で検証
6. 画像が見つからない電車は trains.json から外し、`docs/image-sourcing.md` 末尾の
   「未収集リスト」に理由付きで記録して発注者に報告する
```

- [ ] **Step 3: trains.json を全件に拡張**

仕様書 §6 の3つの表の全行を、次の変換規則で `src/data/trains.json` に転記する:
- `name.hiragana` = 表の「ひらがな」列そのまま(例外: 表内で「イーストアイ」「とれいゆ つばさ」などカタカナ・スペースを含むものは `いーすとあい` `とれいゆつばさ` にひらがな化する)
- `name.normal` = 表の「ふつう表記」列そのまま(★印は除去)
- `category` = しんかんせん表→`shinkansen` / とっきゅう表→`express` / ふつうでんしゃ表→`local`
- `id` = 上記の命名規則、`image` = `images/trains/<id>.webp`
- 上記の lookalikes 一覧を登録(必ず相互に)
- 既存12件は id を変えずに残す

Run: `npm test`
Expected: PASS(データ検証テストが全件を検証。ひらがな正規表現エラーが出た行は表記を修正)

- [ ] **Step 4: 写真を収集・変換する**

`docs/image-sourcing.md` の手順に従い、全電車の写真を収集して `npm run images` で変換する。WebFetch/WebSearch が使えるエージェントが実行すること。10件ごとに `npm run validate` で進捗確認。

Run: `npm run validate`
Expected: `OK`(見つからなかった電車は trains.json から外して未収集リストに記録済み)

- [ ] **Step 5: 動作確認と Commit**

Run: `npm test && npm run build`
Expected: PASS。`npm run dev` で実写真のクイズが遊べる

```bash
git add -A
git commit -m "feat: add full train dataset with photos and credits"
```

---

### Task 11: PWA化(マニフェスト・Service Worker・アイコン)

**Files:**
- Create: `public/icon.svg`, `scripts/make-icons.mjs`, `public/icons/*.png`
- Modify: `vite.config.ts`, `index.html`, `package.json`

**Interfaces:**
- Consumes: Task 1〜10 の成果物一式
- Produces: オフラインで完全動作するビルド(`dist/`)

- [ ] **Step 1: アイコンを作成**

`public/icon.svg`:
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="96" fill="#1c7ed6"/>
  <path d="M256 96 C 350 96 400 160 400 260 L400 330 Q400 360 370 360 L142 360 Q112 360 112 330 L112 260 C112 160 162 96 256 96 Z" fill="#fff"/>
  <rect x="150" y="150" width="212" height="60" rx="20" fill="#1864ab"/>
  <circle cx="180" cy="320" r="18" fill="#1864ab"/>
  <circle cx="332" cy="320" r="18" fill="#1864ab"/>
  <rect x="128" y="384" width="256" height="16" rx="8" fill="#fff"/>
</svg>
```

`scripts/make-icons.mjs`:
```js
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

mkdirSync('public/icons', { recursive: true });
for (const size of [192, 512, 180]) {
  const name = size === 180 ? 'apple-touch-icon.png' : `icon-${size}.png`;
  await sharp('public/icon.svg').resize(size, size).png().toFile(`public/icons/${name}`);
  console.log('generated:', name);
}
```

`package.json` scripts に追加: `"icons": "node scripts/make-icons.mjs"`

Run: `npm run icons`
Expected: `public/icons/` に3ファイル

- [ ] **Step 2: vite-plugin-pwa を設定**

Run: `npm install -D vite-plugin-pwa`

`vite.config.ts`(置き換え):
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/train-quiz/',
  plugins: [
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'でんしゃクイズ',
        short_name: 'でんしゃクイズ',
        display: 'standalone',
        orientation: 'landscape',
        lang: 'ja',
        background_color: '#e7f5ff',
        theme_color: '#1c7ed6',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,webp,wav,json,webmanifest}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
      },
    }),
  ],
  test: { environment: 'happy-dom' },
});
```

`index.html` の `<head>` に追記:
```html
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="default" />
<meta name="apple-mobile-web-app-title" content="でんしゃクイズ" />
<link rel="apple-touch-icon" href="icons/apple-touch-icon.png" />
```

- [ ] **Step 3: オフライン動作を確認**

Run: `npm run build && npm run preview`
確認手順: ブラウザで `http://localhost:4173/train-quiz/` を開く → DevTools > Application > Service Workers で activated を確認 → Network を Offline にしてリロード → アプリが動き、写真・音も出ること
Expected: オフラインで全機能動作

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "feat: add PWA manifest, service worker precache, and app icons"
```

---

### Task 12: GitHub Pages デプロイ

**Files:**
- Create: `.github/workflows/deploy.yml`, `README.md`

**Interfaces:**
- Consumes: Task 11 のビルド
- Produces: `https://yuichikawata0521.github.io/train-quiz/` で公開されたアプリ

- [ ] **Step 1: ワークフローを作成**

`.github/workflows/deploy.yml`:
```yaml
name: Deploy to GitHub Pages
on:
  push:
    branches: [main]
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  deploy:
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm test
      - run: npm run build
      - uses: actions/configure-pages@v5
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - id: deployment
        uses: actions/deploy-pages@v4
```

- [ ] **Step 2: README を作成**

`README.md`:
```markdown
# でんしゃクイズ

4歳児向けの電車名当てクイズPWA。iPad の Safari で
https://yuichikawata0521.github.io/train-quiz/ を開き、
共有ボタン → 「ホーム画面に追加」でインストール。以降はオフラインで動作します。

- 仕様書: docs/superpowers/specs/2026-08-31-train-quiz-design.md
- 開発: `npm install && npm run dev` / テスト: `npm test`
- 素材の再生成: `npm run sounds` / `npm run icons` / `npm run images` / 検証: `npm run validate`
- 設定画面: スタート画面右下の歯車を3秒長押し
```

- [ ] **Step 3: Pages を有効化してデプロイ**

```bash
gh api -X POST repos/YuichiKawata0521/train-quiz/pages -f build_type=workflow || true
git add -A
git commit -m "ci: add GitHub Pages deploy workflow"
git push
gh run watch --exit-status
```
Expected: ワークフロー成功

- [ ] **Step 4: 公開URLを確認**

Run: `curl -sI https://yuichikawata0521.github.io/train-quiz/ | head -1`
Expected: `HTTP/2 200`

- [ ] **Step 5: Commit(未コミット分があれば)**

```bash
git status --short
```
Expected: クリーン

---

## 補足: ユーザー支給素材の受け入れ

犬の車掌さん画像(ユーザーが生成AIで用意)は、届き次第 `public/images/conductor/` に以下の名前で配置するだけで表示される(未配置でも `onerror` で非表示になりアプリは動く):

| ファイル名 | ポーズ |
|---|---|
| `normal.png` | 通常(スタート画面) |
| `happy.png` | 喜び(正解時) |
| `sad.png` | 困り顔(不正解時) |
| `celebrate.png` | 祝福(結果画面) |

配置後に `npm run build` して再デプロイ(push)すれば反映される。
