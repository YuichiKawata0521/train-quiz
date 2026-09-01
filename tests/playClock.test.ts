import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { initPlayClock } from '../src/ui/playClock';
import { addPlayTime, DAILY_LIMIT_SECONDS } from '../src/logic/playTimer';
import { DEFAULT_SETTINGS } from '../src/logic/settings';
import type { Settings } from '../src/logic/types';

let settings: Settings;

beforeEach(() => {
  localStorage.clear();
  settings = { ...DEFAULT_SETTINGS, adultMode: false };
});

afterEach(() => {
  document.body.innerHTML = '';
});

function clock(): { el: HTMLElement; update: () => void } {
  return initPlayClock(() => settings);
}

describe('initPlayClock', () => {
  it('bodyに時計要素を追加し、0秒なら塗りは0deg', () => {
    const { el } = clock();
    expect(document.body.contains(el)).toBe(true);
    expect(el.className).toContain('play-clock');
    expect(el.style.getPropertyValue('--clock-deg')).toBe('0deg');
  });

  it('5分(1/3)で120deg、7.5分で180deg', () => {
    addPlayTime(300);
    const a = clock();
    expect(a.el.style.getPropertyValue('--clock-deg')).toBe('120deg');
    addPlayTime(150);
    a.update();
    expect(a.el.style.getPropertyValue('--clock-deg')).toBe('180deg');
  });

  it('10分(2/3)以降は almost、15分で full かつ360degで頭打ち', () => {
    addPlayTime(600);
    const { el, update } = clock();
    expect(el.classList.contains('almost')).toBe(true);
    expect(el.classList.contains('full')).toBe(false);
    addPlayTime(DAILY_LIMIT_SECONDS); // 上限超過
    update();
    expect(el.classList.contains('full')).toBe(true);
    expect(el.style.getPropertyValue('--clock-deg')).toBe('360deg');
  });

  it('おとなモード中は非表示、戻すと再表示される', () => {
    settings.adultMode = true;
    const { el, update } = clock();
    expect(el.hidden).toBe(true);
    settings.adultMode = false;
    update();
    expect(el.hidden).toBe(false);
  });

  it('タップを邪魔しない(pointer-events無効のクラス設計をCSSで持つ)', () => {
    // スタイル本体はCSSにあるため、ここでは要素が操作対象にならない役割属性のみ確認
    const { el } = clock();
    expect(el.getAttribute('aria-hidden')).toBe('true');
  });
});
