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
    Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) }),
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

describe('playVoice(せつめい音声)', () => {
  function voiceCalls(fetchFn: unknown): string[] {
    return (fetchFn as ReturnType<typeof vi.fn>).mock.calls
      .map((c) => String(c[0]))
      .filter((url) => url.includes('voices/'));
  }

  it('voices/<id>.m4a を取得してデコードし再生する。同じidの2回目はキャッシュから鳴る', async () => {
    const context = new FakeAudioContext();
    const fetchFn = fakeFetch();
    const player = initAudio(() => makeSettings(true), { context: asCtx(context), fetchFn });
    await flush();
    player.playVoice('e5-hayabusa');
    await flush();
    expect(voiceCalls(fetchFn)).toEqual([expect.stringContaining('voices/e5-hayabusa.m4a')]);
    expect(context.sources).toHaveLength(1);
    player.playVoice('e5-hayabusa');
    await flush();
    expect(voiceCalls(fetchFn)).toHaveLength(1); // 再フェッチしない
    expect(context.sources).toHaveLength(2);
  });

  it('sound=false なら取得も再生もしない', async () => {
    const context = new FakeAudioContext();
    const fetchFn = fakeFetch();
    const player = initAudio(() => makeSettings(false), { context: asCtx(context), fetchFn });
    await flush();
    player.playVoice('e5-hayabusa');
    await flush();
    expect(voiceCalls(fetchFn)).toHaveLength(0);
    expect(context.sources).toHaveLength(0);
  });

  it('stopVoice で停止する。停止後に届いた古いデコード結果は再生しない', async () => {
    const context = new FakeAudioContext();
    const player = initAudio(() => makeSettings(true), { context: asCtx(context), fetchFn: fakeFetch() });
    await flush();
    player.playVoice('e5-hayabusa');
    player.stopVoice(); // デコード完了前に停止
    await flush();
    expect(context.sources).toHaveLength(0);
    player.playVoice('e5-hayabusa');
    await flush();
    expect(context.sources).toHaveLength(1);
    player.stopVoice();
    expect(context.sources[0].stop).toHaveBeenCalledOnce();
  });

  it('別の電車を再生すると前の音声を止める', async () => {
    const context = new FakeAudioContext();
    const player = initAudio(() => makeSettings(true), { context: asCtx(context), fetchFn: fakeFetch() });
    await flush();
    player.playVoice('a');
    await flush();
    player.playVoice('b');
    await flush();
    expect(context.sources).toHaveLength(2);
    expect(context.sources[0].stop).toHaveBeenCalled();
  });

  it('音声ファイルがない(404)場合も落ちない', async () => {
    const context = new FakeAudioContext();
    const fetchFn = vi.fn((url: string) =>
      Promise.resolve(
        String(url).includes('voices/')
          ? { ok: false, arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) }
          : { ok: true, arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)) },
      ),
    ) as unknown as typeof fetch;
    const player = initAudio(() => makeSettings(true), { context: asCtx(context), fetchFn });
    await flush();
    expect(() => player.playVoice('zzz')).not.toThrow();
    await flush();
    expect(context.sources).toHaveLength(0);
  });
});
