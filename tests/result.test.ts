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
    description: 'てすとの せつめいだよ。',
  };
}

const mode: Mode = {
  id: 'local',
  label: { hiragana: 'ふつうでんしゃ', normal: '普通電車' },
  categories: ['local'],
  heroTrain: 'images/hero/local.webp',
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
