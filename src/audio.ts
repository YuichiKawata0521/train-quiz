import type { Settings } from './logic/types';
import type { AudioPlayer, SoundName } from './app';
import { asset } from './ui/asset';

// tap/arrive は合成音(make-sounds.mjs)、それ以外はユーザー選定の音源(効果音ラボ)
const FILES: Record<SoundName, string> = {
  tap: 'tap.wav',
  horn: 'horn.mp3',
  wrong: 'wrong.mp3',
  depart: 'depart.mp3',
  arrive: 'arrive.wav',
  fanfare: 'fanfare.mp3',
  run: 'run.mp3',
};

// HTMLAudio は iOS の PWA(Service Workerキャッシュ)で2回目以降の再生が
// 失敗する(Range非対応シーク・ended状態の再再生quirk)。Web Audio API の
// バッファ再生なら毎回新しいソースを作るため確実に鳴る。
export interface AudioContextLike {
  state: string;
  destination: AudioNode | object;
  resume(): Promise<void>;
  decodeAudioData(data: ArrayBuffer): Promise<AudioBuffer>;
  createBufferSource(): AudioBufferSourceNode;
}

interface AudioDeps {
  context?: AudioContextLike;
  fetchFn?: typeof fetch;
}

export function initAudio(getSettings: () => Settings, deps: AudioDeps = {}): AudioPlayer {
  const context: AudioContextLike = deps.context ?? new AudioContext();
  const fetchFn = deps.fetchFn ?? fetch.bind(globalThis);

  const buffers = new Map<SoundName, AudioBuffer>();
  const playing = new Map<SoundName, AudioBufferSourceNode>();

  for (const name of Object.keys(FILES) as SoundName[]) {
    fetchFn(asset(`sounds/${FILES[name]}`))
      .then((res) => res.arrayBuffer())
      .then((data) => context.decodeAudioData(data))
      .then((buffer) => {
        buffers.set(name, buffer);
      })
      .catch(() => {});
  }

  // iOS Safari: AudioContext は suspended で始まるため、最初のタップで resume
  const unlock = () => {
    void context.resume().catch(() => {});
    document.removeEventListener('pointerup', unlock);
    document.removeEventListener('touchend', unlock);
  };
  document.addEventListener('pointerup', unlock);
  document.addEventListener('touchend', unlock);

  return {
    play(name) {
      if (!getSettings().sound) return;
      const buffer = buffers.get(name);
      if (!buffer) return;
      // iOSは復帰時に suspended/interrupted になることがあるため running 以外は resume
      if (context.state !== 'running') void context.resume().catch(() => {});
      const source = context.createBufferSource();
      source.buffer = buffer;
      source.connect(context.destination as AudioNode);
      source.start();
      playing.set(name, source);
    },
    stop(name) {
      const source = playing.get(name);
      if (!source) return;
      try {
        source.stop();
      } catch {
        // 既に停止済みなら無視
      }
      playing.delete(name);
    },
  };
}
