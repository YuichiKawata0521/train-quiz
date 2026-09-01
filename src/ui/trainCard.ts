import type { Train } from '../logic/types';
import type { AppContext } from '../app';
import { asset } from './asset';

/** おと設定に従って、カード用の音声コールバックを作る(OFFなら undefined) */
export function trainVoice(ctx: AppContext, train: Train): TrainCardOptions['voice'] {
  if (!ctx.settings.sound) return undefined;
  return {
    play: () => ctx.audio.playVoice(train.id),
    stop: () => ctx.audio.stopVoice(),
  };
}

export interface TrainCardOptions {
  train: Train;
  /** とじる / つぎへ など */
  closeLabel: string;
  /** お祝いや学習カードの見出し(省略可) */
  title?: string;
  /** せつめい音声(未指定なら🔊なし・自動再生なし。おと設定OFF時は渡さない) */
  voice?: { play(): void; stop(): void };
  /** ボタンタップ時の効果音フック */
  onTap?: () => void;
  onClose: () => void;
}

/**
 * 電車の写真・なまえ・せつめいを見せる共通カード。
 * 図鑑の詳細 / 間違えたあとの学習 / 解禁のお祝い で共用する。
 */
export function openTrainCard(host: HTMLElement, opts: TrainCardOptions): HTMLElement {
  const overlay = document.createElement('div');
  overlay.className = 'overlay train-card';
  overlay.innerHTML = `
    ${opts.title ? `<div class="train-card-title">${opts.title}</div>` : ''}
    <figure class="photo-card"><img class="train-card-photo" src="${asset(opts.train.image)}" alt=""></figure>
    <div class="train-card-name">${opts.train.name.hiragana}</div>
    <div class="train-card-formal">${opts.train.name.normal}</div>
    <p class="train-card-desc">${opts.train.description}</p>
    <div class="train-card-actions">
      ${opts.voice ? '<button class="btn train-card-speak" data-action="speak" aria-label="よみあげ">🔊</button>' : ''}
      <button class="btn btn-primary" data-action="close">${opts.closeLabel}</button>
    </div>`;
  host.appendChild(overlay);

  if (opts.voice) {
    opts.voice.play();
    overlay.querySelector<HTMLButtonElement>('[data-action=speak]')!.addEventListener(
      'click',
      () => {
        opts.onTap?.();
        opts.voice!.play();
      },
    );
  }
  overlay.querySelector<HTMLButtonElement>('[data-action=close]')!.addEventListener('click', () => {
    opts.onTap?.();
    opts.voice?.stop();
    overlay.remove();
    opts.onClose();
  });
  return overlay;
}
