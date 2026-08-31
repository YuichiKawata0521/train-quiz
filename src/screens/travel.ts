import type { AppContext, ScreenName } from '../app';
import { asset } from '../ui/asset';

interface TravelOptions {
  variant: 'depart' | 'run' | 'arrive';
  label: string;
  durationMs: number;
  next: ScreenName;
}

function playTravel(ctx: AppContext, opts: TravelOptions): void {
  ctx.root.innerHTML = `
    <section class="screen screen-travel travel-${opts.variant} platform-bg"
             style="background-image:url(${asset('images/bg/platform.webp')})">
      ${opts.label ? `<div class="travel-label">${opts.label}</div>` : ''}
      <img class="travel-train" src="${asset(ctx.currentMode!.heroTrain)}" alt="">
    </section>`;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    ctx.navigate(opts.next);
  };
  const timer = setTimeout(finish, opts.durationMs);
  ctx.root.querySelector<HTMLElement>('.screen')!.addEventListener('click', finish);
}

export function renderDeparture(ctx: AppContext): void {
  ctx.audio.play('depart');
  playTravel(ctx, { variant: 'depart', label: 'しゅっぱつ!', durationMs: 3000, next: 'question' });
}

export function renderInterlude(ctx: AppContext): void {
  playTravel(ctx, { variant: 'run', label: '', durationMs: 2000, next: 'question' });
}

export function renderArrival(ctx: AppContext): void {
  ctx.audio.play('arrive');
  playTravel(ctx, { variant: 'arrive', label: 'とうちゃく!', durationMs: 2500, next: 'result' });
}
