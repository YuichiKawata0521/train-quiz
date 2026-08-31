import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderInterlude, renderDeparture } from '../src/screens/travel';
import type { AppContext } from '../src/app';
import type { Mode } from '../src/logic/types';

const mode: Mode = {
  id: 'shinkansen',
  label: { hiragana: 'しんかんせん', normal: '新幹線' },
  categories: ['shinkansen'],
  heroTrain: 'images/hero/shinkansen.webp',
};

function fixtureCtx(): AppContext {
  return {
    root: document.createElement('div'),
    trains: [],
    modes: [mode],
    settings: { notation: 'hiragana', questionCount: 5, sound: false },
    audio: { play: vi.fn(), stop: vi.fn() },
    currentMode: mode,
    session: null,
    navigate: vi.fn(),
  } as unknown as AppContext;
}

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('travel screens', () => {
  it('interlude は走行音を鳴らし、2秒後に止めて question へ', () => {
    const ctx = fixtureCtx();
    renderInterlude(ctx);
    expect(ctx.audio.play).toHaveBeenCalledWith('run');
    vi.advanceTimersByTime(2000);
    expect(ctx.audio.stop).toHaveBeenCalledWith('run');
    expect(ctx.navigate).toHaveBeenCalledWith('question');
  });
  it('タップでスキップでき、二重遷移しない', () => {
    const ctx = fixtureCtx();
    renderDeparture(ctx);
    ctx.root.querySelector<HTMLElement>('.screen')!.click();
    expect(ctx.navigate).toHaveBeenCalledTimes(1);
    expect(ctx.navigate).toHaveBeenCalledWith('question');
    vi.advanceTimersByTime(5000);
    expect(ctx.navigate).toHaveBeenCalledTimes(1);
  });
});
