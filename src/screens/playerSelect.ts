import type { AppContext, Player } from '../app';

// 下の子(れん)はまだ文字が読めないため、色でも自分のボタンを覚えられるようにする
const PLAYERS: { id: Player; label: string; icon: string }[] = [
  { id: 'hiroto', label: 'ひろと', icon: '🚄' },
  { id: 'ren', label: 'れん', icon: '🚃' },
];

export function renderPlayerSelect(ctx: AppContext): void {
  ctx.root.innerHTML = `
    <section class="screen screen-player-select">
      <h2 class="heading">だれが あそぶ?</h2>
      <div class="card-grid">
        ${PLAYERS.map(
          (p) => `
          <button class="btn player-card player-${p.id}" data-player="${p.id}">
            <span class="player-icon">${p.icon}</span>
            <span>${p.label}</span>
          </button>`,
        ).join('')}
      </div>
      <button class="btn btn-back" data-action="back">もどる</button>
    </section>`;
  for (const btn of ctx.root.querySelectorAll<HTMLButtonElement>('[data-player]')) {
    btn.addEventListener('click', () => {
      ctx.audio.play('tap');
      ctx.player = btn.dataset.player as Player;
      ctx.navigate('gameSelect');
    });
  }
  ctx.root.querySelector<HTMLButtonElement>('[data-action=back]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    ctx.navigate('start');
  });
}
