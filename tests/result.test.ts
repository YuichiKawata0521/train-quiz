import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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
    newUnlocks: [],
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
  it('ドアは遊んだモードの電車になる', () => {
    const ctx = fixtureCtx(); // mode id = 'local'
    renderResult(ctx);
    const doors = [...ctx.root.querySelectorAll<HTMLImageElement>('.door img')];
    expect(doors).toHaveLength(2);
    for (const img of doors) expect(img.src).toContain('images/bg/doors-local.webp');
  });
  it('モード不明時はぜんぶ用のドアにフォールバックする', () => {
    const ctx = fixtureCtx();
    ctx.currentMode = null;
    renderResult(ctx);
    expect(ctx.root.querySelector<HTMLImageElement>('.door img')!.src).toContain(
      'images/bg/doors-all.webp',
    );
  });
});

describe('renderResult: 解禁のお祝い', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('新しい解禁があると、ドアが開いたあとお祝いカードが出る', () => {
    const ctx = fixtureCtx();
    ctx.newUnlocks = ['a'];
    renderResult(ctx);
    expect(ctx.root.querySelector('.train-card')).toBeNull();
    vi.advanceTimersByTime(3400);
    const card = ctx.root.querySelector<HTMLElement>('.train-card')!;
    expect(card).not.toBeNull();
    expect(card.querySelector('.train-card-title')!.textContent).toBe(
      'あたらしい でんしゃを げっと!',
    );
    expect(card.querySelector('.train-card-name')!.textContent).toBe('やまのてせん');
    card.querySelector<HTMLButtonElement>('[data-action=close]')!.click();
    expect(ctx.root.querySelector('.train-card')).toBeNull();
  });

  it('複数解禁なら「つぎへ」で順番にお祝いする', () => {
    const ctx = fixtureCtx();
    ctx.newUnlocks = ['a', 'b'];
    renderResult(ctx);
    vi.advanceTimersByTime(3400);
    const first = ctx.root.querySelector<HTMLElement>('.train-card')!;
    expect(first.querySelector('[data-action=close]')!.textContent).toBe('つぎへ');
    first.querySelector<HTMLButtonElement>('[data-action=close]')!.click();
    const second = ctx.root.querySelector<HTMLElement>('.train-card')!;
    expect(second.querySelector('.train-card-name')!.textContent).toBe('ちゅうおうせん');
    expect(second.querySelector('[data-action=close]')!.textContent).toBe('とじる');
  });

  it('解禁がなければお祝いカードは出ない', () => {
    const ctx = fixtureCtx();
    renderResult(ctx);
    vi.advanceTimersByTime(5000);
    expect(ctx.root.querySelector('.train-card')).toBeNull();
  });

  it('「もういちど」で newUnlocks がリセットされる', () => {
    const ctx = fixtureCtx();
    ctx.newUnlocks = ['a'];
    renderResult(ctx);
    ctx.root.querySelector<HTMLButtonElement>('[data-action=retry]')!.click();
    expect(ctx.newUnlocks).toEqual([]);
  });

  it('カードが出る前に「もどる」で画面を離れたら、次の画面に幽霊カードが出ない', () => {
    const ctx = fixtureCtx();
    ctx.newUnlocks = ['a'];
    renderResult(ctx);
    ctx.root.querySelector<HTMLButtonElement>('[data-action=back]')!.click();
    expect(ctx.newUnlocks).toEqual([]);
    ctx.root.innerHTML = '<section class="screen screen-mode-select"></section>';
    vi.advanceTimersByTime(10000);
    expect(ctx.root.querySelector('.train-card')).toBeNull();
  });

  it('カードが出る前に「もういちど」でも幽霊カードが出ない', () => {
    const ctx = fixtureCtx();
    ctx.newUnlocks = ['a'];
    renderResult(ctx);
    ctx.root.querySelector<HTMLButtonElement>('[data-action=retry]')!.click();
    ctx.root.innerHTML = '<section class="screen screen-travel"></section>';
    vi.advanceTimersByTime(10000);
    expect(ctx.root.querySelector('.train-card')).toBeNull();
  });
});
