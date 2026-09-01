import type { Settings } from '../logic/types';
import { loadPlayTime, DAILY_LIMIT_SECONDS } from '../logic/playTimer';

export interface PlayClock {
  el: HTMLElement;
  update(): void;
}

/**
 * 画面右上に常時表示するプレイ時間の円(15分で一周)。
 * 画面遷移で消えないよう #app の外(body直下)に置く。
 */
export function initPlayClock(getSettings: () => Settings): PlayClock {
  const el = document.createElement('div');
  el.className = 'play-clock';
  el.setAttribute('aria-hidden', 'true');
  document.body.appendChild(el);

  const update = (): void => {
    if (getSettings().adultMode) {
      el.hidden = true;
      return;
    }
    el.hidden = false;
    const ratio = Math.min(loadPlayTime() / DAILY_LIMIT_SECONDS, 1);
    el.style.setProperty('--clock-deg', `${Math.round(ratio * 360)}deg`);
    el.classList.toggle('almost', ratio >= 2 / 3 && ratio < 1);
    el.classList.toggle('full', ratio >= 1);
  };

  update();
  return { el, update };
}
