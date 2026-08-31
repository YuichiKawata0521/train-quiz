import { describe, it, expect, vi } from 'vitest';
import { initAudio, type AudioContextLike } from '../src/audio';
import type { Settings } from '../src/logic/types';

function makeSettings(sound: boolean): Settings {
  return { notation: 'hiragana', questionCount: 5, sound, adultMode: false };
}

class FakeSource {
  buffer: unknown = null;
  connect = vi.fn();
  start = vi.fn();
  stop = vi.fn();
}

class FakeAudioContext {
  state = 'suspended';
  destination = {};
  sources: FakeSource[] = [];
  resume = vi.fn(() => {
    this.state = 'running';
    return Promise.resolve();
  });
  decodeAudioData = vi.fn(() => Promise.resolve({ duration: 1 }));
  createBufferSource = vi.fn(() => {
    const s = new FakeSource();
    this.sources.push(s);
    return s;
  });
}

function fakeFetch() {
  return vi.fn(() =>
    Promise.resolve({ arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }),
  ) as unknown as typeof fetch;
}

const asCtx = (c: FakeAudioContext) => c as unknown as AudioContextLike;

async function flush() {
  // マクロタスクを1周させて fetch→decode→set のマイクロタスク連鎖を全て流す
  await new Promise((r) => setTimeout(r, 0));
}

describe('initAudio (Web Audio)', () => {
  it('全7音源をfetchしてデコードする', async () => {
    const context = new FakeAudioContext();
    const fetchFn = fakeFetch();
    initAudio(() => makeSettings(true), { context: asCtx(context), fetchFn });
    await flush();
    expect(fetchFn).toHaveBeenCalledTimes(7);
    expect(context.decodeAudioData).toHaveBeenCalledTimes(7);
  });

  it('sound=false なら再生しない', async () => {
    const context = new FakeAudioContext();
    const player = initAudio(() => makeSettings(false), { context: asCtx(context), fetchFn: fakeFetch() });
    await flush();
    player.play('horn');
    expect(context.createBufferSource).not.toHaveBeenCalled();
  });

  it('連続再生のたびに新しいソースで start する(2回目以降も鳴る)', async () => {
    const context = new FakeAudioContext();
    const player = initAudio(() => makeSettings(true), { context: asCtx(context), fetchFn: fakeFetch() });
    await flush();
    player.play('horn');
    player.play('horn');
    player.play('wrong');
    expect(context.sources).toHaveLength(3);
    for (const s of context.sources) {
      expect(s.start).toHaveBeenCalledOnce();
      expect(s.connect).toHaveBeenCalledWith(context.destination);
    }
  });

  it('stop で該当ソースを停止する', async () => {
    const context = new FakeAudioContext();
    const player = initAudio(() => makeSettings(true), { context: asCtx(context), fetchFn: fakeFetch() });
    await flush();
    player.play('run');
    player.stop('run');
    expect(context.sources[0].stop).toHaveBeenCalledOnce();
  });

  it('最初の pointerup で AudioContext を resume する(iOSアンロック)', async () => {
    const context = new FakeAudioContext();
    initAudio(() => makeSettings(true), { context: asCtx(context), fetchFn: fakeFetch() });
    document.dispatchEvent(new Event('pointerup'));
    expect(context.resume).toHaveBeenCalled();
  });

  it('バッファ未ロードの音は無視する(エラーにしない)', () => {
    const context = new FakeAudioContext();
    const player = initAudio(() => makeSettings(true), { context: asCtx(context), fetchFn: fakeFetch() });
    expect(() => player.play('horn')).not.toThrow();
    expect(context.sources).toHaveLength(0);
  });
});
