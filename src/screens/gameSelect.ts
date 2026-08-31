import type { AppContext } from '../app';
import { asset } from '../ui/asset';

const GAMES = [{ id: 'train-quiz', label: 'でんしゃクイズ', icon: 'images/hero/shinkansen.webp' }];

export function renderGameSelect(ctx: AppContext): void {
  ctx.root.innerHTML = `
    <section class="screen screen-game-select">
      <h2 class="heading">どれで あそぶ?</h2>
      <div class="card-grid">
        ${GAMES.map(
          (g) => `
          <button class="btn game-card" data-game="${g.id}">
            <img src="${asset(g.icon)}" alt="">
            <span>${g.label}</span>
          </button>`,
        ).join('')}
      </div>
      <button class="btn btn-back" data-action="back">もどる</button>
    </section>`;
  ctx.root.querySelector<HTMLButtonElement>('[data-game=train-quiz]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    ctx.navigate('modeSelect');
  });
  ctx.root.querySelector<HTMLButtonElement>('[data-action=back]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    ctx.navigate('start');
  });
}
