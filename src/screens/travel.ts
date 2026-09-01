import type { AppContext, ScreenName } from '../app';
import { asset } from '../ui/asset';
import { stationBg, runBg } from '../ui/backgrounds';

interface TravelOptions {
  variant: 'depart' | 'run' | 'arrive';
  label: string;
  durationMs: number;
  next: ScreenName;
  bg: string;
}

function playTravel(ctx: AppContext, opts: TravelOptions): void {
  ctx.root.innerHTML = `
    <section class="screen screen-travel travel-${opts.variant} platform-bg"
             style="background-image:url(${opts.bg})">
      ${opts.label ? `<div class="travel-label">${opts.label}</div>` : ''}
      <img class="travel-train" src="${asset(ctx.currentMode!.heroTrain)}" alt="">
    </section>`;
  let done = false;
  const finish = () => {
    if (done) return;
    done = true;
    clearTimeout(timer);
    if (opts.variant === 'run') ctx.audio.stop('run');
    ctx.navigate(opts.next);
  };
  const timer = setTimeout(finish, opts.durationMs);
  ctx.root.querySelector<HTMLElement>('.screen')!.addEventListener('click', finish);
}

export function renderDeparture(ctx: AppContext): void {
  ctx.audio.play('depart');
  playTravel(ctx, {
    variant: 'depart',
    label: 'しゅっぱつ!',
    durationMs: 3000,
    next: 'question',
    bg: stationBg(0),
  });
}

export function renderInterlude(ctx: AppContext): void {
  ctx.audio.play('run');
  playTravel(ctx, {
    variant: 'run',
    label: '',
    durationMs: 2000,
    next: 'question',
    bg: runBg(ctx.session?.current ?? 0),
  });
}

export function renderArrival(ctx: AppContext): void {
  ctx.audio.play('arrive');
  playTravel(ctx, {
    variant: 'arrive',
    label: 'とうちゃく!',
    durationMs: 2500,
    next: 'result',
    bg: stationBg(ctx.session?.questions.length ?? 0),
  });
}
