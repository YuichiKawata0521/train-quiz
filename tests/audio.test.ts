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
});
