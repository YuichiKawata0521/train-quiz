import type { Train } from '../logic/types';
import { asset } from './asset';
import { isSpeechAvailable, speakTrain, stopSpeech } from './speech';

export interface TrainCardOptions {
  train: Train;
  /** とじる / つぎへ など */
  closeLabel: string;
  /** お祝いや学習カードの見出し(省略可) */
  title?: string;
  /** 読み上げを使うか(おと設定)。非対応環境では自動的に無効 */
  speech: boolean;
  /** ボタンタップ時の効果音フック */
  onTap?: () => void;
  onClose: () => void;
}

/**
 * 電車の写真・なまえ・せつめいを見せる共通カード。
 * 図鑑の詳細 / 間違えたあとの学習 / 解禁のお祝い で共用する。
 */
export function openTrainCard(host: HTMLElement, opts: TrainCardOptions): HTMLElement {
  const speechOn = opts.speech && isSpeechAvailable();
  const overlay = document.createElement('div');
  overlay.className = 'overlay train-card';
  overlay.innerHTML = `
    ${opts.title ? `<div class="train-card-title">${opts.title}</div>` : ''}
    <figure class="photo-card"><img class="train-card-photo" src="${asset(opts.train.image)}" alt=""></figure>
    <div class="train-card-name">${opts.train.name.hiragana}</div>
    <div class="train-card-formal">${opts.train.name.normal}</div>
    <p class="train-card-desc">${opts.train.description}</p>
    <div class="train-card-actions">
      ${speechOn ? '<button class="btn train-card-speak" data-action="speak" aria-label="よみあげ">🔊</button>' : ''}
      <button class="btn btn-primary" data-action="close">${opts.closeLabel}</button>
    </div>`;
  host.appendChild(overlay);

  if (speechOn) {
    speakTrain(opts.train);
    overlay.querySelector<HTMLButtonElement>('[data-action=speak]')!.addEventListener(
      'click',
      () => {
        opts.onTap?.();
        speakTrain(opts.train);
      },
    );
  }
  overlay.querySelector<HTMLButtonElement>('[data-action=close]')!.addEventListener('click', () => {
    opts.onTap?.();
    stopSpeech();
    overlay.remove();
    opts.onClose();
  });
  return overlay;
}
