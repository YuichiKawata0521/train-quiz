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
