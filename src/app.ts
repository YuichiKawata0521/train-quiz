import type { Train, Mode, Settings } from './logic/types';
import type { SessionState } from './logic/quiz';
import { loadSettings } from './logic/settings';
import trainsJson from './data/trains.json';
import modesJson from './data/modes.json';
import { renderStart } from './screens/start';
import { renderGameSelect } from './screens/gameSelect';
import { renderModeSelect } from './screens/modeSelect';
import { renderSettingsScreen } from './screens/settingsScreen';
import { renderQuestion } from './screens/question';
import { renderDeparture, renderInterlude, renderArrival } from './screens/travel';
import { renderResult } from './screens/result';

export type ScreenName =
  | 'start'
  | 'gameSelect'
  | 'modeSelect'
  | 'departure'
  | 'question'
  | 'interlude'
  | 'arrival'
  | 'result'
  | 'settings';

export type SoundName = 'tap' | 'horn' | 'wrong' | 'depart' | 'arrive' | 'fanfare';

export interface AudioPlayer {
  play(name: SoundName): void;
}

export interface AppContext {
  root: HTMLElement;
  trains: Train[];
  modes: Mode[];
  settings: Settings;
  audio: AudioPlayer;
  currentMode: Mode | null;
  session: SessionState | null;
  navigate(screen: ScreenName): void;
}

type ScreenRenderer = (ctx: AppContext) => void;

// 後続タスクの画面はここに追記していく
export const screens: Partial<Record<ScreenName, ScreenRenderer>> = {
  start: renderStart,
  gameSelect: renderGameSelect,
  modeSelect: renderModeSelect,
  departure: renderDeparture,
  question: renderQuestion,
  interlude: renderInterlude,
  arrival: renderArrival,
  result: renderResult,
  settings: renderSettingsScreen,
};

export function createApp(
  root: HTMLElement,
  audio: AudioPlayer = { play: () => {} },
): AppContext {
  const ctx: AppContext = {
    root,
    trains: trainsJson as Train[],
    modes: modesJson as Mode[],
    settings: loadSettings(),
    audio,
    currentMode: null,
    session: null,
    navigate(screen) {
      const render = screens[screen];
      if (!render) throw new Error(`画面が未登録: ${screen}`);
      root.innerHTML = '';
      render(ctx);
    },
  };
  return ctx;
}
