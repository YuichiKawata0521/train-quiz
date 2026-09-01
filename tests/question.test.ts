import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderQuestion } from '../src/screens/question';
import { createSession } from '../src/logic/quiz';
import { countFor, recordFirstTryCorrect, UNLOCK_COUNT } from '../src/logic/zukan';
import type { AppContext } from '../src/app';
import type { Train, Mode } from '../src/logic/types';

// Vitest replaces `.css` imports (even with `?raw`) with an empty string
// by default (perf optimization), so read the file directly with node:fs
// to inspect its actual contents. Vitest's cwd is the project root.
const css = readFileSync('src/styles.css', 'utf-8');

function train(id: string, hiragana: string): Train {
  return {
    id,
    name: { hiragana, normal: hiragana },
    category: 'local',
    image: `images/trains/${id}.webp`,
    description: 'てすとの せつめいだよ。',
  };
}

const mode: Mode = {
  id: 'local',
  label: { hiragana: 'ふつうでんしゃ', normal: '普通電車' },
  categories: ['local'],
  heroTrain: 'images/hero/local.webp',
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
    newUnlocks: [],
    navigate: vi.fn(),
  } as unknown as AppContext;
  document.body.appendChild(ctx.root);
  return ctx;
}

beforeEach(() => {
  vi.useFakeTimers();
  localStorage.clear();
});
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
    expect(ctx.audio.play).toHaveBeenCalledWith('wrong');
    expect(ctx.root.querySelector<HTMLImageElement>('.conductor')!.src).toContain('sad.png');
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
    expect(ctx.audio.play).toHaveBeenCalledWith('horn');
    expect(ctx.root.querySelector<HTMLImageElement>('.conductor')!.src).toContain('happy.png');
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

  it('進捗バー: 現在の問題までの駅がpassedになり、電車アイコンが表示される', () => {
    const ctx = fixtureCtx(3);
    renderQuestion(ctx);
    const stations = [...ctx.root.querySelectorAll<HTMLElement>('.station')];
    expect(stations).toHaveLength(3);
    expect(stations[0].classList.contains('passed')).toBe(true);
    expect(stations[1].classList.contains('passed')).toBe(false);
    expect(stations[2].classList.contains('passed')).toBe(false);
    const progressTrain = ctx.root.querySelector<HTMLImageElement>('.progress-train')!;
    expect(progressTrain).not.toBeNull();
    expect(progressTrain.src).toContain('images/hero/local.webp');
  });

  it('CSS: hidden属性のときオーバーレイが非表示になるルールがある', () => {
    // .overlay { display: flex; ... } だけだと HTML の hidden 属性による
    // UAスタイル(display:none)を上書きし、常時表示・クリック遮断のバグになる。
    // .overlay[hidden] { display: none; } で明示的に打ち消す必要がある。
    expect(css).toContain('.overlay[hidden]');
  });

  it('1発正解で図鑑カウントが1増える', () => {
    const ctx = fixtureCtx(2);
    renderQuestion(ctx);
    const q = ctx.session!.questions[0];
    const buttons = [...ctx.root.querySelectorAll<HTMLButtonElement>('.choice')];
    buttons[q.correctIndex].click();
    expect(countFor(q.train.id)).toBe(1);
  });

  it('まちがえたあとの正解では図鑑カウントが増えない', () => {
    const ctx = fixtureCtx(2);
    renderQuestion(ctx);
    const q = ctx.session!.questions[0];
    const buttons = [...ctx.root.querySelectorAll<HTMLButtonElement>('.choice')];
    buttons[q.correctIndex === 0 ? 1 : 0].click();
    vi.advanceTimersByTime(1500);
    buttons[q.correctIndex].click();
    expect(countFor(q.train.id)).toBe(0);
  });

  it('れんが遊んでいるときは1発正解でも図鑑カウントが増えない', () => {
    const ctx = fixtureCtx(2);
    ctx.player = 'ren';
    renderQuestion(ctx);
    const q = ctx.session!.questions[0];
    for (let i = 0; i < UNLOCK_COUNT - 1; i++) recordFirstTryCorrect(q.train.id);
    [...ctx.root.querySelectorAll<HTMLButtonElement>('.choice')][q.correctIndex].click();
    expect(countFor(q.train.id)).toBe(UNLOCK_COUNT - 1);
    expect(ctx.newUnlocks).toEqual([]);
  });

  it('5回目の1発正解で newUnlocks に積まれる(4回目までは積まれない)', () => {
    const ctx = fixtureCtx(2);
    renderQuestion(ctx);
    const q = ctx.session!.questions[0];
    for (let i = 0; i < UNLOCK_COUNT - 1; i++) recordFirstTryCorrect(q.train.id);
    const buttons = [...ctx.root.querySelectorAll<HTMLButtonElement>('.choice')];
    buttons[q.correctIndex].click();
    expect(ctx.newUnlocks).toEqual([q.train.id]);
  });

  it('まちがえた問題は、正解後に学習カードが出て「つぎへ」で進む', () => {
    const ctx = fixtureCtx(2);
    renderQuestion(ctx);
    const q = ctx.session!.questions[0];
    const buttons = [...ctx.root.querySelectorAll<HTMLButtonElement>('.choice')];
    buttons[q.correctIndex === 0 ? 1 : 0].click();
    vi.advanceTimersByTime(1500);
    buttons[q.correctIndex].click();
    // ◯の表示のあいだはまだカードは出ない
    expect(ctx.root.querySelector('.train-card')).toBeNull();
    vi.advanceTimersByTime(1500);
    expect(ctx.navigate).not.toHaveBeenCalled();
    const card = ctx.root.querySelector<HTMLElement>('.train-card')!;
    expect(card).not.toBeNull();
    expect(card.querySelector('.train-card-title')!.textContent).toBe('おぼえよう!');
    expect(card.querySelector('.train-card-name')!.textContent).toBe(q.train.name.hiragana);
    expect(card.querySelector('.train-card-desc')!.textContent).toBe(q.train.description);
    card.querySelector<HTMLButtonElement>('[data-action=close]')!.click();
    expect(ctx.root.querySelector('.train-card')).toBeNull();
    expect(ctx.navigate).toHaveBeenCalledWith('interlude');
  });

  it('1発正解のときは学習カードなしでそのまま進む', () => {
    const ctx = fixtureCtx(2);
    renderQuestion(ctx);
    const q = ctx.session!.questions[0];
    [...ctx.root.querySelectorAll<HTMLButtonElement>('.choice')][q.correctIndex].click();
    vi.advanceTimersByTime(1500);
    expect(ctx.root.querySelector('.train-card')).toBeNull();
    expect(ctx.navigate).toHaveBeenCalledWith('interlude');
  });
});
