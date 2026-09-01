import type { AppContext } from '../app';
import { answer, isFinished } from '../logic/quiz';
import { displayName } from '../logic/settings';
import { asset } from '../ui/asset';
import { stationBg } from '../ui/backgrounds';
import { recordFirstTryCorrect, UNLOCK_COUNT } from '../logic/zukan';
import { openTrainCard } from '../ui/trainCard';

const FEEDBACK_MS = 1500;

export function renderQuestion(ctx: AppContext): void {
  const session = ctx.session!;
  const q = session.questions[session.current];
  const total = session.questions.length;

  ctx.root.innerHTML = `
    <section class="screen screen-question platform-bg"
             style="background-image:url(${stationBg(session.current)})">
      <div class="progress">
        ${Array.from({ length: total }, (_, i) => `<span class="station${i <= session.current ? ' passed' : ''}"></span>`).join('')}
        <img class="progress-train" style="left:${(session.current / Math.max(total - 1, 1)) * 88}%"
             src="${asset(ctx.currentMode!.heroTrain)}" alt="">
      </div>
      <figure class="photo-card">
        <img src="${asset(q.train.image)}" alt="でんしゃのしゃしん">
      </figure>
      <div class="choices">
        ${q.choices
          .map((c, i) => `<button class="btn choice" data-index="${i}">${displayName(c, session.notation)}</button>`)
          .join('')}
      </div>
      <div class="overlay" hidden>
        <div class="mark"></div>
        <div class="verdict"></div>
        <img class="conductor" alt="" onerror="this.hidden=true">
      </div>
    </section>`;

  const overlay = ctx.root.querySelector<HTMLElement>('.overlay')!;
  const mark = overlay.querySelector<HTMLElement>('.mark')!;
  const verdict = overlay.querySelector<HTMLElement>('.verdict')!;
  const conductor = overlay.querySelector<HTMLImageElement>('.conductor')!;
  const buttons = [...ctx.root.querySelectorAll<HTMLButtonElement>('.choice')];

  for (const btn of buttons) {
    btn.addEventListener('click', () => {
      const firstTry = !session.failedThisQuestion;
      const result = answer(session, Number(btn.dataset.index));
      for (const b of buttons) b.disabled = true;
      conductor.hidden = false;
      if (result === 'correct') {
        if (firstTry && recordFirstTryCorrect(q.train.id) === UNLOCK_COUNT) {
          ctx.newUnlocks.push(q.train.id);
        }
        ctx.audio.play('horn');
        mark.textContent = '◯';
        mark.className = 'mark mark-correct';
        verdict.textContent = 'せいかい';
        conductor.src = asset('images/conductor/happy.png');
        overlay.hidden = false;
        const next = isFinished(session) ? 'arrival' : 'interlude';
        setTimeout(() => {
          if (firstTry) {
            ctx.navigate(next);
            return;
          }
          // 間違えた問題は、進む前に写真となまえをゆっくり確認できるようにする
          overlay.hidden = true;
          openTrainCard(ctx.root, {
            train: q.train,
            title: 'おぼえよう!',
            closeLabel: 'つぎへ',
            speech: ctx.settings.sound,
            onTap: () => ctx.audio.play('tap'),
            onClose: () => ctx.navigate(next),
          });
        }, FEEDBACK_MS);
      } else {
        ctx.audio.play('wrong');
        mark.textContent = '✕';
        mark.className = 'mark mark-wrong';
        verdict.textContent = 'もういっかい';
        conductor.src = asset('images/conductor/sad.png');
        overlay.hidden = false;
        setTimeout(() => {
          overlay.hidden = true;
          btn.classList.add('choice-used');
          for (const b of buttons) {
            if (!b.classList.contains('choice-used')) b.disabled = false;
          }
        }, FEEDBACK_MS);
      }
    });
  }
}
