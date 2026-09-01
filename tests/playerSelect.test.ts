import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderPlayerSelect } from '../src/screens/playerSelect';
import { createApp } from '../src/app';
import type { AppContext } from '../src/app';

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '';
});

function fixtureCtx(): AppContext {
  const ctx = {
    root: document.createElement('div'),
    trains: [],
    modes: [],
    settings: { notation: 'hiragana', questionCount: 5, sound: false, adultMode: false },
    audio: { play: vi.fn(), stop: vi.fn() },
    currentMode: null,
    session: null,
    newUnlocks: [],
    player: 'hiroto',
    navigate: vi.fn(),
  } as unknown as AppContext;
  document.body.appendChild(ctx.root);
  return ctx;
}

describe('renderPlayerSelect', () => {
  it('ひろと と れん の2つのボタンが出る', () => {
    const ctx = fixtureCtx();
    renderPlayerSelect(ctx);
    const buttons = [...ctx.root.querySelectorAll<HTMLButtonElement>('[data-player]')];
    expect(buttons).toHaveLength(2);
    expect(buttons[0].textContent).toContain('ひろと');
    expect(buttons[1].textContent).toContain('れん');
    expect(ctx.root.textContent).toContain('だれが あそぶ?');
  });

  it('ひろとを選ぶと player=hiroto で gameSelect へ', () => {
    const ctx = fixtureCtx();
    ctx.player = 'ren';
    renderPlayerSelect(ctx);
    ctx.root.querySelector<HTMLButtonElement>('[data-player=hiroto]')!.click();
    expect(ctx.player).toBe('hiroto');
    expect(ctx.navigate).toHaveBeenCalledWith('gameSelect');
  });

  it('れんを選ぶと player=ren で gameSelect へ', () => {
    const ctx = fixtureCtx();
    renderPlayerSelect(ctx);
    ctx.root.querySelector<HTMLButtonElement>('[data-player=ren]')!.click();
    expect(ctx.player).toBe('ren');
    expect(ctx.navigate).toHaveBeenCalledWith('gameSelect');
  });

  it('もどるで start へ', () => {
    const ctx = fixtureCtx();
    renderPlayerSelect(ctx);
    ctx.root.querySelector<HTMLButtonElement>('[data-action=back]')!.click();
    expect(ctx.navigate).toHaveBeenCalledWith('start');
  });
});

describe('画面フロー', () => {
  function appRoot(): HTMLElement {
    document.body.innerHTML = '<div id="app"></div>';
    return document.querySelector<HTMLElement>('#app')!;
  }

  it('スタートの「はじめる」で だれがあそぶ? へ', () => {
    const app = createApp(appRoot());
    app.navigate('start');
    document.querySelector<HTMLButtonElement>('[data-action=start]')!.click();
    expect(document.querySelector('.screen-player-select')).not.toBeNull();
  });

  it('だれがあそぶ? → ゲーム選択 → もどる で だれがあそぶ? に戻る', () => {
    const app = createApp(appRoot());
    app.navigate('playerSelect');
    document.querySelector<HTMLButtonElement>('[data-player=ren]')!.click();
    expect(document.querySelector('.screen-game-select')).not.toBeNull();
    document.querySelector<HTMLButtonElement>('[data-action=back]')!.click();
    expect(document.querySelector('.screen-player-select')).not.toBeNull();
  });
});
