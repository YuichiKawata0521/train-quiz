import { describe, it, expect, vi } from 'vitest';
import { onLongPress } from '../src/ui/longPress';

describe('onLongPress', () => {
  it('指定時間押し続けると発火する', () => {
    vi.useFakeTimers();
    const el = document.createElement('button');
    const cb = vi.fn();
    onLongPress(el, 3000, cb);
    el.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(3000);
    expect(cb).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });
  it('途中で離すと発火しない', () => {
    vi.useFakeTimers();
    const el = document.createElement('button');
    const cb = vi.fn();
    onLongPress(el, 3000, cb);
    el.dispatchEvent(new Event('pointerdown'));
    vi.advanceTimersByTime(2999);
    el.dispatchEvent(new Event('pointerup'));
    vi.advanceTimersByTime(5000);
    expect(cb).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
