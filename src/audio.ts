import type { Settings } from './logic/types';
import type { AudioPlayer, SoundName } from './app';
import { asset } from './ui/asset';

const NAMES: SoundName[] = ['tap', 'horn', 'wrong', 'depart', 'arrive', 'fanfare'];

export function initAudio(
  getSettings: () => Settings,
  AudioCtor: typeof Audio = Audio,
): AudioPlayer {
  const elements = new Map<SoundName, HTMLAudioElement>();
  for (const name of NAMES) {
    elements.set(name, new AudioCtor(asset(`sounds/${name}.wav`)));
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
    document.removeEventListener('pointerdown', unlock);
  };
  document.addEventListener('pointerdown', unlock);

  return {
    play(name) {
      if (!getSettings().sound) return;
      const el = elements.get(name)!;
      intentionallyPlaying.add(el);
      el.muted = false;
      el.currentTime = 0;
      void el.play().catch(() => {});
    },
  };
}
