import type { AppContext } from '../app';

export function renderSettingsScreen(ctx: AppContext): void {
  ctx.root.innerHTML = `
    <section class="screen screen-settings">
      <h2 class="heading">せってい(おうちのひとよう)</h2>
      <button class="btn btn-back" data-action="back">もどる</button>
    </section>`;
  ctx.root.querySelector<HTMLButtonElement>('[data-action=back]')!.addEventListener('click', () => {
    ctx.navigate('start');
  });
}
