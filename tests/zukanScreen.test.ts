import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderZukan } from '../src/screens/zukan';
import { createApp } from '../src/app';
import { recordFirstTryCorrect, UNLOCK_COUNT } from '../src/logic/zukan';
import type { AppContext } from '../src/app';
import type { Train, Category } from '../src/logic/types';

function train(id: string, category: Category): Train {
  return {
    id,
    name: { hiragana: `でんしゃ${id}`, normal: `電車${id}` },
    category,
    image: `images/trains/${id}.webp`,
    description: `${id}の せつめいだよ。`,
  };
}

// しんかんせん2 / とっきゅう9 / ふつう1 → 見開き4(0 / 1,2 / 3)
function fixtureTrains(): Train[] {
  return [
    train('s1', 'shinkansen'),
    train('s2', 'shinkansen'),
    ...Array.from({ length: 9 }, (_, i) => train(`e${i + 1}`, 'express')),
    train('l1', 'local'),
  ];
}

function fixtureCtx(): AppContext {
  const ctx = {
    root: document.createElement('div'),
    trains: fixtureTrains(),
    modes: [],
    settings: { notation: 'hiragana', questionCount: 5, sound: false, adultMode: false },
    audio: { play: vi.fn(), stop: vi.fn() },
    currentMode: null,
    session: null,
    navigate: vi.fn(),
  } as unknown as AppContext;
  document.body.appendChild(ctx.root);
  return ctx;
}

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

describe('renderZukan: 見開きの表示', () => {
  it('1見開き目に左右4枠ずつ描画され、余りは空き枠になる', () => {
    const ctx = fixtureCtx();
    renderZukan(ctx);
    const leftSlots = ctx.root.querySelectorAll('.zukan-page-left .zukan-slot');
    const rightSlots = ctx.root.querySelectorAll('.zukan-page-right .zukan-slot');
    expect(leftSlots).toHaveLength(4);
    expect(rightSlots).toHaveLength(4);
    // しんかんせんは2件: 左ページに2 + 空き2、右ページは空き4
    expect(ctx.root.querySelectorAll('.zukan-page-left .zukan-empty')).toHaveLength(2);
    expect(ctx.root.querySelectorAll('.zukan-page-right .zukan-empty')).toHaveLength(4);
  });

  it('未解禁: ぼかし写真+スタンプが出て、集めた数だけ点灯する', () => {
    recordFirstTryCorrect('s1');
    recordFirstTryCorrect('s1');
    const ctx = fixtureCtx();
    renderZukan(ctx);
    const locked = ctx.root.querySelector('.zukan-locked')!;
    expect(locked.querySelector('.zukan-photo img')).not.toBeNull();
    expect(locked.querySelectorAll('.stamp')).toHaveLength(UNLOCK_COUNT);
    expect(locked.querySelectorAll('.stamp.on')).toHaveLength(2);
    expect(locked.textContent).not.toContain('でんしゃs1');
  });

  it('解禁済み: 写真と なまえ が出る', () => {
    for (let i = 0; i < UNLOCK_COUNT; i++) recordFirstTryCorrect('s1');
    const ctx = fixtureCtx();
    renderZukan(ctx);
    const unlocked = ctx.root.querySelector<HTMLElement>('.zukan-unlocked')!;
    expect(unlocked.dataset.train).toBe('s1');
    expect(unlocked.textContent).toContain('でんしゃs1');
    expect(unlocked.querySelectorAll('.stamp')).toHaveLength(0);
  });

  it('カウンター: あつめた n/全数 が出る', () => {
    for (let i = 0; i < UNLOCK_COUNT; i++) recordFirstTryCorrect('s1');
    const ctx = fixtureCtx();
    renderZukan(ctx);
    expect(ctx.root.querySelector('.zukan-counter')!.textContent).toContain('あつめた 1/12');
  });

  it('タブが3つあり、もどるで gameSelect へ', () => {
    const ctx = fixtureCtx();
    renderZukan(ctx);
    expect(ctx.root.querySelectorAll('.zukan-tab')).toHaveLength(3);
    ctx.root.querySelector<HTMLButtonElement>('[data-action=back]')!.click();
    expect(ctx.navigate).toHaveBeenCalledWith('gameSelect');
  });
});

describe('図鑑への入口と登録', () => {
  it('ゲーム選択画面の「でんしゃずかん」カードで zukan へ遷移する', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const app = createApp(document.querySelector<HTMLElement>('#app')!);
    app.navigate('gameSelect');
    document.querySelector<HTMLButtonElement>('[data-game=zukan]')!.click();
    expect(document.querySelector('.screen-zukan')).not.toBeNull();
  });
});
