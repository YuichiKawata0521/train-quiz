import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { renderQuestion } from '../src/screens/question';
import { createSession } from '../src/logic/quiz';
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
    expect(progressTrain.src).toContain('images/hero/local.svg');
  });

  it('CSS: hidden属性のときオーバーレイが非表示になるルールがある', () => {
    // .overlay { display: flex; ... } だけだと HTML の hidden 属性による
    // UAスタイル(display:none)を上書きし、常時表示・クリック遮断のバグになる。
    // .overlay[hidden] { display: none; } で明示的に打ち消す必要がある。
    expect(css).toContain('.overlay[hidden]');
  });
});
