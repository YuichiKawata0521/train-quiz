import type { AppContext } from '../app';
import { asset } from '../ui/asset';
import { onLongPress } from '../ui/longPress';

export function renderStart(ctx: AppContext): void {
  ctx.root.innerHTML = `
    <section class="screen screen-start" style="background-image:url(${asset('images/bg/terminal.webp')})">
      <img class="start-train start-train-1" src="${asset('images/hero/shinkansen.webp')}" alt="">
      <img class="start-train start-train-2" src="${asset('images/hero/all.webp')}" alt="">
      <div class="start-panel">
        <h1 class="title">でんしゃクイズ</h1>
        <img class="conductor conductor-lg" src="${asset('images/conductor/normal.png')}" alt="" onerror="this.hidden=true">
        <button class="btn btn-primary" data-action="start">はじめる</button>
      </div>
      <button class="gear" data-action="settings" aria-label="せってい">⚙</button>
    </section>`;
  ctx.root.querySelector<HTMLButtonElement>('[data-action=start]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    ctx.navigate('playerSelect');
  });
  onLongPress(
    ctx.root.querySelector<HTMLButtonElement>('[data-action=settings]')!,
    3000,
    () => ctx.navigate('settings'),
  );
}
