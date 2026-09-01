import type { Train, Mode, Settings } from './logic/types';
import type { SessionState } from './logic/quiz';
import { loadSettings } from './logic/settings';
import trainsJson from './data/trains.json';
import modesJson from './data/modes.json';
import { renderStart } from './screens/start';
import { renderPlayerSelect } from './screens/playerSelect';
import { renderGameSelect } from './screens/gameSelect';
import { renderModeSelect } from './screens/modeSelect';
import { renderSettingsScreen } from './screens/settingsScreen';
import { renderQuestion } from './screens/question';
import { renderDeparture, renderInterlude, renderArrival } from './screens/travel';
import { renderResult } from './screens/result';
import { renderLocked } from './screens/locked';
import { renderZukan } from './screens/zukan';
import { isTimeUp } from './logic/playTimer';

export type ScreenName =
  | 'start'
  | 'playerSelect'
  | 'gameSelect'
  | 'modeSelect'
  | 'departure'
  | 'question'
  | 'interlude'
  | 'arrival'
  | 'result'
  | 'settings'
  | 'locked'
  | 'zukan';

// 時間切れ時にロック画面へ差し替える画面。ゲーム中(question〜result)は
// その回の結果発表まで見せるため含めない。settings は親用なので常に開ける。
const LOCKABLE: ReadonlySet<ScreenName> = new Set([
  'start',
  'playerSelect',
  'gameSelect',
  'modeSelect',
  'departure',
  'zukan',
]);

/** 遊んでいる子。れん は図鑑カウントを増やさない(ひろとのコレクションを守る) */
export type Player = 'hiroto' | 'ren';

export type SoundName = 'tap' | 'horn' | 'wrong' | 'depart' | 'arrive' | 'fanfare' | 'run';

export interface AudioPlayer {
  play(name: SoundName): void;
  stop(name: SoundName): void;
  /** せつめい音声(voices/<trainId>.m4a)を再生。前の音声は止まる */
  playVoice(trainId: string): void;
  stopVoice(): void;
}

export interface AppContext {
  root: HTMLElement;
  trains: Train[];
  modes: Mode[];
  settings: Settings;
  audio: AudioPlayer;
  currentMode: Mode | null;
  session: SessionState | null;
  /** このセッション中に図鑑へ新しく登録された電車id(結果画面でお祝いする) */
  newUnlocks: string[];
  player: Player;
  navigate(screen: ScreenName): void;
}

type ScreenRenderer = (ctx: AppContext) => void;

// 後続タスクの画面はここに追記していく
export const screens: Partial<Record<ScreenName, ScreenRenderer>> = {
  start: renderStart,
  playerSelect: renderPlayerSelect,
  gameSelect: renderGameSelect,
  modeSelect: renderModeSelect,
  departure: renderDeparture,
  question: renderQuestion,
  interlude: renderInterlude,
  arrival: renderArrival,
  result: renderResult,
  settings: renderSettingsScreen,
  locked: renderLocked,
  zukan: renderZukan,
};

export function createApp(
  root: HTMLElement,
  audio: AudioPlayer = { play: () => {}, stop: () => {}, playVoice: () => {}, stopVoice: () => {} },
): AppContext {
  const ctx: AppContext = {
    root,
    trains: trainsJson as Train[],
    modes: modesJson as Mode[],
    settings: loadSettings(),
    audio,
    currentMode: null,
    session: null,
    newUnlocks: [],
    player: 'hiroto',
    navigate(screen) {
      const target =
        !ctx.settings.adultMode && isTimeUp() && LOCKABLE.has(screen) ? 'locked' : screen;
      const render = screens[target];
      if (!render) throw new Error(`画面が未登録: ${target}`);
      ctx.audio.stopVoice(); // 画面を離れるときは読み上げを必ず止める
      root.innerHTML = '';
      render(ctx);
    },
  };
  return ctx;
}
