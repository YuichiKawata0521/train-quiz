import './styles.css';
import { createApp } from './app';
import { initAudio } from './audio';
import { addPlayTime, isTimeUp } from './logic/playTimer';
import { initPlayClock } from './ui/playClock';

const root = document.querySelector<HTMLElement>('#app')!;
const app = createApp(root, initAudio(() => app.settings));
app.navigate('start');

const clock = initPlayClock(() => app.settings);

// 1日のプレイ時間を計測(画面表示中のみ・おとなモード中は停止)
setInterval(() => {
  clock.update();
  if (document.visibilityState !== 'visible') return;
  if (app.settings.adultMode) return;
  if (isTimeUp()) return;
  addPlayTime(1);
}, 1000);
