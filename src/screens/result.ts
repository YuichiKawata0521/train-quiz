import type { AppContext } from '../app';
import { createSession, poolForMode } from '../logic/quiz';
import { asset } from '../ui/asset';
import { openTrainCard, trainVoice } from '../ui/trainCard';

// ドアが開き切る(delay 0.6s + transition 2.4s)のを待ってからお祝いを出す
const UNLOCK_CELEBRATION_DELAY_MS = 3400;

export function renderResult(ctx: AppContext): void {
  const session = ctx.session!;
  const total = session.questions.length;
  const perfect = session.score === total;
  ctx.audio.play('fanfare');
  // ドアは遊んだモードの電車(モードIDと画像名を揃えてある)
  const doorSrc = asset(`images/bg/doors-${ctx.currentMode?.id ?? 'all'}.webp`);
  ctx.root.innerHTML = `
    <section class="screen screen-result platform-bg"
             style="background-image:url(${asset('images/bg/result.webp')})">
      <div class="doors">
        <div class="door door-left"><img src="${doorSrc}" alt=""></div>
        <div class="door door-right"><img src="${doorSrc}" alt=""></div>
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

  // このセッションで図鑑に新しく登録された電車をお祝い(複数なら順番に)
  function celebrateUnlock(index: number): void {
    if (index >= ctx.newUnlocks.length) return;
    const train = ctx.trains.find((t) => t.id === ctx.newUnlocks[index]);
    if (!train) {
      celebrateUnlock(index + 1); // 不明idは飛ばして残りを祝う
      return;
    }
    ctx.audio.play('horn');
    openTrainCard(ctx.root, {
      train,
      title: 'あたらしい でんしゃを げっと!',
      closeLabel: index + 1 < ctx.newUnlocks.length ? 'つぎへ' : 'とじる',
      voice: trainVoice(ctx, train),
      onTap: () => ctx.audio.play('tap'),
      onClose: () => celebrateUnlock(index + 1),
    });
  }
  // ドア演出中もボタンは押せる(doors は pointer-events:none)ため、
  // 画面を離れるときは必ずタイマーを止めないと次の画面に幽霊カードが出る
  let celebrationTimer: ReturnType<typeof setTimeout> | undefined;
  if (ctx.newUnlocks.length > 0) {
    celebrationTimer = setTimeout(() => celebrateUnlock(0), UNLOCK_CELEBRATION_DELAY_MS);
  }
  ctx.root.querySelector<HTMLButtonElement>('[data-action=retry]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    clearTimeout(celebrationTimer);
    ctx.newUnlocks = [];
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
    clearTimeout(celebrationTimer);
    ctx.newUnlocks = [];
    ctx.navigate('modeSelect');
  });
}
