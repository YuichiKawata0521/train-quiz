import { describe, it, expect, beforeEach, vi } from 'vitest';
import { openTrainCard, trainVoice } from '../src/ui/trainCard';
import type { Train } from '../src/logic/types';
import type { AppContext } from '../src/app';

const train: Train = {
  id: 'e5-hayabusa',
  name: { hiragana: 'はやぶさ', normal: 'はやぶさ(E5系)' },
  category: 'shinkansen',
  image: 'images/trains/e5-hayabusa.webp',
  description: 'みどりの しんかんせんだよ。',
};

beforeEach(() => {
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
      onClose: vi.fn(),
    });
    expect(host().querySelector('.train-card-title')!.textContent).toBe(
      'あたらしい でんしゃを げっと!',
    );
  });

  it('とじるでカードが消え、onClose が呼ばれる', () => {
    const onClose = vi.fn();
    const onTap = vi.fn();
    openTrainCard(host(), { train, closeLabel: 'とじる', onClose, onTap });
    host().querySelector<HTMLButtonElement>('[data-action=close]')!.click();
    expect(host().querySelector('.train-card')).toBeNull();
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onTap).toHaveBeenCalled();
  });

  it('voice付きなら開いたとき自動再生+🔊でもう一回、とじるで停止', () => {
    const voice = { play: vi.fn(), stop: vi.fn() };
    openTrainCard(host(), { train, closeLabel: 'とじる', voice, onClose: vi.fn() });
    expect(voice.play).toHaveBeenCalledTimes(1);
    const speakBtn = host().querySelector<HTMLButtonElement>('[data-action=speak]')!;
    expect(speakBtn).not.toBeNull();
    speakBtn.click();
    expect(voice.play).toHaveBeenCalledTimes(2);
    host().querySelector<HTMLButtonElement>('[data-action=close]')!.click();
    expect(voice.stop).toHaveBeenCalledTimes(1);
  });

  it('voiceなしなら🔊ボタンを出さない', () => {
    openTrainCard(host(), { train, closeLabel: 'とじる', onClose: vi.fn() });
    expect(host().querySelector('[data-action=speak]')).toBeNull();
  });
});

describe('trainVoice', () => {
  function voiceCtx(sound: boolean) {
    const audio = { play: vi.fn(), stop: vi.fn(), playVoice: vi.fn(), stopVoice: vi.fn() };
    const ctx = { settings: { sound }, audio } as unknown as AppContext;
    return { ctx, audio };
  }

  it('おとONなら ctx.audio.playVoice / stopVoice に電車idで配線される', () => {
    const { ctx, audio } = voiceCtx(true);
    const voice = trainVoice(ctx, train)!;
    voice.play();
    expect(audio.playVoice).toHaveBeenCalledWith('e5-hayabusa');
    voice.stop();
    expect(audio.stopVoice).toHaveBeenCalledTimes(1);
  });

  it('おとOFFなら undefined(カードに🔊が出ない)', () => {
    const { ctx } = voiceCtx(false);
    expect(trainVoice(ctx, train)).toBeUndefined();
  });
});
