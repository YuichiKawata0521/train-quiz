import { describe, it, expect, vi } from 'vitest';
import { initAudio } from '../src/audio';
import type { Settings } from '../src/logic/types';

class FakeAudio {
  static instances: FakeAudio[] = [];
  src: string;
  currentTime = 0;
  muted = false;
  play = vi.fn(() => Promise.resolve());
  pause = vi.fn();
  constructor(src: string) {
    this.src = src;
    FakeAudio.instances.push(this);
  }
}

function makeSettings(sound: boolean): Settings {
  return { notation: 'hiragana', questionCount: 5, sound };
}

describe('initAudio', () => {
  it('sound=true なら play が呼ばれる', () => {
    FakeAudio.instances = [];
    const player = initAudio(() => makeSettings(true), FakeAudio as unknown as typeof Audio);
    player.play('horn');
    const horn = FakeAudio.instances.find((a) => a.src.includes('horn'));
    expect(horn!.play).toHaveBeenCalled();
  });
  it('sound=false なら再生しない', () => {
    FakeAudio.instances = [];
    const player = initAudio(() => makeSettings(false), FakeAudio as unknown as typeof Audio);
    player.play('horn');
    for (const a of FakeAudio.instances) expect(a.play).not.toHaveBeenCalled();
  });
  it('play() 後に muted===false になる', () => {
    FakeAudio.instances = [];
    const player = initAudio(() => makeSettings(true), FakeAudio as unknown as typeof Audio);
    const horn = FakeAudio.instances.find((a) => a.src.includes('horn'))!;
    horn.muted = true;
    player.play('horn');
    expect(horn.muted).toBe(false);
  });
  it('pointerup で unlock が発動、意図的再生中の要素は pause されない', async () => {
    FakeAudio.instances = [];
    const player = initAudio(() => makeSettings(true), FakeAudio as unknown as typeof Audio);
    const horn = FakeAudio.instances.find((a) => a.src.includes('horn'))!;
    player.play('horn');
    expect(horn.play).toHaveBeenCalled();
    document.dispatchEvent(new PointerEvent('pointerup'));
    await Promise.resolve();
    expect(horn.pause).not.toHaveBeenCalled();
  });
});
