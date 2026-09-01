import type { AppContext, ScreenName } from '../app';
import { asset } from '../ui/asset';

const GAMES: { id: string; label: string; icon: string; screen: ScreenName }[] = [
  {
    id: 'train-quiz',
    label: 'でんしゃクイズ',
    icon: 'images/hero/shinkansen.webp',
    screen: 'modeSelect',
  },
  { id: 'zukan', label: 'でんしゃずかん', icon: 'images/zukan/cover.webp', screen: 'zukan' },
];

export function renderGameSelect(ctx: AppContext): void {
  ctx.root.innerHTML = `
    <section class="screen screen-game-select">
      <h2 class="heading">どれで あそぶ?</h2>
      <div class="card-grid">
        ${GAMES.map(
          (g) => `
          <button class="btn game-card" data-game="${g.id}">
            <img src="${asset(g.icon)}" alt="" onerror="this.hidden=true">
            <span>${g.label}</span>
          </button>`,
        ).join('')}
      </div>
      <button class="btn btn-back" data-action="back">もどる</button>
    </section>`;
  for (const g of GAMES) {
    ctx.root.querySelector<HTMLButtonElement>(`[data-game=${g.id}]`)!.addEventListener(
      'click',
      () => {
        ctx.audio.play('tap');
        ctx.navigate(g.screen);
      },
    );
  }
  ctx.root.querySelector<HTMLButtonElement>('[data-action=back]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    ctx.navigate('start');
  });
}
