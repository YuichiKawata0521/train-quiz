import type { AppContext } from '../app';
import { asset } from '../ui/asset';
import { createSession, poolForMode } from '../logic/quiz';

export function renderModeSelect(ctx: AppContext): void {
  ctx.root.innerHTML = `
    <section class="screen screen-mode-select">
      <h2 class="heading">どの でんしゃ で あそぶ?</h2>
      <div class="card-grid">
        ${ctx.modes
          .map(
            (m) => `
          <button class="btn mode-card" data-mode="${m.id}">
            <img src="${asset(m.heroTrain)}" alt="">
            <span>${m.label.hiragana}</span>
          </button>`,
          )
          .join('')}
      </div>
      <button class="btn btn-back" data-action="back">もどる</button>
    </section>`;
  for (const btn of ctx.root.querySelectorAll<HTMLButtonElement>('[data-mode]')) {
    btn.addEventListener('click', () => {
      ctx.audio.play('tap');
      const mode = ctx.modes.find((m) => m.id === btn.dataset.mode)!;
      ctx.currentMode = mode;
      ctx.session = createSession(
        poolForMode(mode, ctx.trains),
        ctx.settings.questionCount,
        ctx.settings.notation,
        undefined,
        ctx.trains,
      );
      ctx.navigate('question'); // TODO(Task 7): departure 画面実装後に 'departure' へ戻す
    });
  }
  ctx.root.querySelector<HTMLButtonElement>('[data-action=back]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    ctx.navigate('gameSelect');
  });
}
