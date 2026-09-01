import { describe, it, expect, beforeEach } from 'vitest';
import { createApp } from '../src/app';
import { addPlayTime, DAILY_LIMIT_SECONDS } from '../src/logic/playTimer';
import { saveSettings, DEFAULT_SETTINGS } from '../src/logic/settings';

beforeEach(() => {
  localStorage.clear();
  document.body.innerHTML = '<div id="app"></div>';
});

function root(): HTMLElement {
  return document.querySelector<HTMLElement>('#app')!;
}

describe('時間切れロック', () => {
  it('制限未到達ならスタート画面が出る', () => {
    createApp(root()).navigate('start');
    expect(root().querySelector('.screen-start')).not.toBeNull();
  });

  it('制限到達後はメニュー系画面がロック画面になる', () => {
    addPlayTime(DAILY_LIMIT_SECONDS);
    const app = createApp(root());
    app.navigate('start');
    expect(root().querySelector('.screen-locked')).not.toBeNull();
    app.navigate('playerSelect');
    expect(root().querySelector('.screen-locked')).not.toBeNull();
    app.navigate('modeSelect');
    expect(root().querySelector('.screen-locked')).not.toBeNull();
  });

  it('制限到達後も設定画面は開ける', () => {
    addPlayTime(DAILY_LIMIT_SECONDS);
    createApp(root()).navigate('settings');
    expect(root().querySelector('.screen-settings')).not.toBeNull();
  });

  it('おとなモード中はロックされない', () => {
    addPlayTime(DAILY_LIMIT_SECONDS);
    saveSettings({ ...DEFAULT_SETTINGS, adultMode: true });
    createApp(root()).navigate('start');
    expect(root().querySelector('.screen-start')).not.toBeNull();
  });

  it('ロック画面に「おしまい」の文言が出る', () => {
    addPlayTime(DAILY_LIMIT_SECONDS);
    const app = createApp(root());
    app.navigate('gameSelect');
    expect(root().textContent).toContain('おしまい');
    expect(root().textContent).toContain('あした');
  });

  it('制限到達後は図鑑もロック画面になる', () => {
    addPlayTime(DAILY_LIMIT_SECONDS);
    const app = createApp(root());
    app.navigate('zukan');
    expect(root().querySelector('.screen-locked')).not.toBeNull();
  });
});
