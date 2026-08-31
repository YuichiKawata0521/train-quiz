import type { AppContext } from '../app';
import { createSession, poolForMode } from '../logic/quiz';
import { asset } from '../ui/asset';

export function renderResult(ctx: AppContext): void {
  const session = ctx.session!;
  const total = session.questions.length;
  const perfect = session.score === total;
  ctx.audio.play('fanfare');
  ctx.root.innerHTML = `
    <section class="screen screen-result platform-bg"
             style="background-image:url(${asset('images/bg/result.webp')})">
      <div class="doors">
        <div class="door door-left"><img src="${asset('images/bg/doors.webp')}" alt=""></div>
        <div class="door door-right"><img src="${asset('images/bg/doors.webp')}" alt=""></div>
      </div>
      <div class="result-body">
        <img class="conductor conductor-lg" src="${asset('images/conductor/celebrate.png')}" alt="" onerror="this.hidden=true">
        <p class="result-score">${total}もんちゅう ${session.score}もん せいかい!</p>
        ${perfect ? '<p class="hanamaru">💮 ぜんぶ いっぱつ せいかい!</p>' : ''}
        <div class="result-actions">
          <button class="btn" data-action="retry">もういちど</button>
          <button class="btn" data-action="back">もどる</button>
        </div>
      </div>
    </section>`;
  // 閉じた状態のフレームを一度確定させてから open を付けないと transition が発火しない
  const doors = ctx.root.querySelector<HTMLElement>('.doors')!;
  requestAnimationFrame(() => {
    void doors.offsetWidth;
    requestAnimationFrame(() => doors.classList.add('open'));
  });
  ctx.root.querySelector<HTMLButtonElement>('[data-action=retry]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    ctx.session = createSession(
      poolForMode(ctx.currentMode!, ctx.trains),
      ctx.settings.questionCount,
      ctx.settings.notation,
      undefined,
      ctx.trains,
    );
    ctx.navigate('departure');
  });
  ctx.root.querySelector<HTMLButtonElement>('[data-action=back]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    ctx.navigate('modeSelect');
  });
}
