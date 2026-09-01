import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openTrainCard } from '../src/ui/trainCard';
import type { Train } from '../src/logic/types';

const train: Train = {
  id: 'e5-hayabusa',
  name: { hiragana: 'はやぶさ', normal: 'はやぶさ(E5系)' },
  category: 'shinkansen',
  image: 'images/trains/e5-hayabusa.webp',
  description: 'みどりの しんかんせんだよ。',
};

function installFakeSynth() {
  const speak = vi.fn();
  const cancel = vi.fn();
  vi.stubGlobal(
    'SpeechSynthesisUtterance',
    class {
      text: string;
      lang = '';
      rate = 1;
      voice: unknown = null;
      constructor(text: string) {
        this.text = text;
      }
    },
  );
  Object.defineProperty(window, 'speechSynthesis', {
    value: { speak, cancel, getVoices: () => [] },
    configurable: true,
  });
  return { speak, cancel };
}

beforeEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
  document.body.innerHTML = '<div id="host"></div>';
});

function host(): HTMLElement {
  return document.querySelector<HTMLElement>('#host')!;
}

describe('openTrainCard', () => {
  it('写真・なまえ・正式名・せつめい・ボタンを表示する', () => {
    openTrainCard(host(), {
      train,
      closeLabel: 'とじる',
      speech: false,
      onClose: vi.fn(),
    });
    const card = host().querySelector<HTMLElement>('.train-card')!;
    expect(card).not.toBeNull();
    expect(card.querySelector<HTMLImageElement>('.train-card-photo')!.src).toContain(
      'e5-hayabusa.webp',
    );
    expect(card.querySelector('.train-card-name')!.textContent).toBe('はやぶさ');
    expect(card.querySelector('.train-card-formal')!.textContent).toBe('はやぶさ(E5系)');
    expect(card.querySelector('.train-card-desc')!.textContent).toBe(
      'みどりの しんかんせんだよ。',
    );
    expect(card.querySelector('[data-action=close]')!.textContent).toBe('とじる');
    expect(card.querySelector('.train-card-title')).toBeNull();
  });

  it('タイトル付きで開ける(お祝い・おぼえよう用)', () => {
    openTrainCard(host(), {
      train,
      title: 'あたらしい でんしゃを げっと!',
      closeLabel: 'つぎへ',
      speech: false,
      onClose: vi.fn(),
    });
    expect(host().querySelector('.train-card-title')!.textContent).toBe(
      'あたらしい でんしゃを げっと!',
    );
  });

  it('とじるでカードが消え、onClose が呼ばれる', () => {
    const onClose = vi.fn();
    const onTap = vi.fn();
    openTrainCard(host(), { train, closeLabel: 'とじる', speech: false, onClose, onTap });
    host().querySelector<HTMLButtonElement>('[data-action=close]')!.click();
    expect(host().querySelector('.train-card')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onTap).toHaveBeenCalled();
  });

  it('speech有効なら開いたとき自動読み上げ+🔊でもう一回、とじるで停止', () => {
    const { speak, cancel } = installFakeSynth();
    openTrainCard(host(), { train, closeLabel: 'とじる', speech: true, onClose: vi.fn() });
    expect(speak).toHaveBeenCalledTimes(1);
    const speakBtn = host().querySelector<HTMLButtonElement>('[data-action=speak]')!;
    expect(speakBtn).not.toBeNull();
    speakBtn.click();
    expect(speak).toHaveBeenCalledTimes(2);
    host().querySelector<HTMLButtonElement>('[data-action=close]')!.click();
    expect(cancel).toHaveBeenCalled();
  });

  it('speech無効なら🔊ボタンなし・読み上げなし', () => {
    const { speak } = installFakeSynth();
    openTrainCard(host(), { train, closeLabel: 'とじる', speech: false, onClose: vi.fn() });
    expect(host().querySelector('[data-action=speak]')).toBeNull();
    expect(speak).not.toHaveBeenCalled();
  });

  it('speechSynthesis非対応環境では speech:true でも🔊を出さず落ちない', () => {
    openTrainCard(host(), { train, closeLabel: 'とじる', speech: true, onClose: vi.fn() });
    expect(host().querySelector('.train-card')).not.toBeNull();
    expect(host().querySelector('[data-action=speak]')).toBeNull();
  });
});
