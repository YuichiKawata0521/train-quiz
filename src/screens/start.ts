import type { AppContext } from '../app';
import { asset } from '../ui/asset';
import { onLongPress } from '../ui/longPress';

export function renderStart(ctx: AppContext): void {
  ctx.root.innerHTML = `
    <section class="screen screen-start">
      <h1 class="title">でんしゃクイズ</h1>
      <img class="conductor conductor-lg" src="${asset('images/conductor/normal.png')}" alt="" onerror="this.hidden=true">
      <button class="btn btn-primary" data-action="start">はじめる</button>
      <button class="gear" data-action="settings" aria-label="せってい">⚙</button>
    </section>`;
  ctx.root.querySelector<HTMLButtonElement>('[data-action=start]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    ctx.navigate('gameSelect');
  });
  onLongPress(
    ctx.root.querySelector<HTMLButtonElement>('[data-action=settings]')!,
    3000,
    () => ctx.navigate('settings'),
  );
}
