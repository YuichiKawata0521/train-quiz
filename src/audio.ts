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

export function initAudio(
  getSettings: () => Settings,
  AudioCtor: typeof Audio = Audio,
): AudioPlayer {
  const elements = new Map<SoundName, HTMLAudioElement>();
  for (const name of Object.keys(FILES) as SoundName[]) {
    elements.set(name, new AudioCtor(asset(`sounds/${FILES[name]}`)));
  }
  const intentionallyPlaying = new Set<HTMLAudioElement>();
  // iOS Safari: 最初のタップで全要素を一度再生してアンロック
  const unlock = () => {
    for (const el of elements.values()) {
      if (intentionallyPlaying.has(el)) continue;
      el.muted = true;
      el.play()
        .then(() => {
          if (!intentionallyPlaying.has(el)) {
            el.pause();
            el.currentTime = 0;
          }
          el.muted = false;
        })
        .catch(() => {
          el.muted = false;
        });
    }
    document.removeEventListener('pointerup', unlock);
    document.removeEventListener('touchend', unlock);
  };
  document.addEventListener('pointerup', unlock);
  document.addEventListener('touchend', unlock);

  return {
    play(name) {
      if (!getSettings().sound) return;
      const el = elements.get(name)!;
      intentionallyPlaying.add(el);
      el.muted = false;
      el.currentTime = 0;
      void el.play().catch(() => {});
    },
    stop(name) {
      const el = elements.get(name)!;
      el.pause();
      el.currentTime = 0;
    },
  };
}
