import type { AppContext } from '../app';
import { asset } from '../ui/asset';
import { onLongPress } from '../ui/longPress';

export function renderLocked(ctx: AppContext): void {
  ctx.root.innerHTML = `
    <section class="screen screen-locked">
      <img class="conductor conductor-lg" src="${asset('images/conductor/normal.png')}" alt="" onerror="this.hidden=true">
      <h2 class="locked-title">きょうの でんしゃクイズは おしまい!</h2>
      <p class="locked-message">また あした あそぼうね</p>
      <button class="gear" data-action="settings" aria-label="せってい">⚙</button>
    </section>`;
  onLongPress(
    ctx.root.querySelector<HTMLButtonElement>('[data-action=settings]')!,
    3000,
    () => ctx.navigate('settings'),
  );
}
