import './styles.css';
import { createApp } from './app';
import { initAudio } from './audio';

const root = document.querySelector<HTMLElement>('#app')!;
const app = createApp(root, initAudio(() => app.settings));
app.navigate('start');
