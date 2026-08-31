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
  it('おとを変更すると即保存される', () => {
    const ctx = fixtureCtx();
    renderSettingsScreen(ctx);
    const checkbox = ctx.root.querySelector<HTMLInputElement>('input[name=sound]')!;
    checkbox.checked = false;
    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
    expect(ctx.settings.sound).toBe(false);
    expect(loadSettings().sound).toBe(false);
  });
});
