import { describe, it, expect, beforeEach, vi } from 'vitest';
import { isSpeechAvailable, speakTrain, stopSpeech } from '../src/ui/speech';
import type { Train } from '../src/logic/types';

const train: Train = {
  id: 'e5-hayabusa',
  name: { hiragana: 'はやぶさ', normal: 'はやぶさ(E5系)' },
  category: 'shinkansen',
  image: 'images/trains/e5-hayabusa.webp',
  description: 'みどりの しんかんせんだよ。',
};

interface FakeUtterance {
  text: string;
  lang: string;
  rate: number;
  voice: unknown;
}

function installFakeSynth(voices: { lang: string }[] = []) {
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
  const synth = { speak, cancel, getVoices: () => voices };
  Object.defineProperty(window, 'speechSynthesis', { value: synth, configurable: true });
  return { speak, cancel };
}

function uninstallSynth() {
  Object.defineProperty(window, 'speechSynthesis', { value: undefined, configurable: true });
}

beforeEach(() => {
  vi.unstubAllGlobals();
});

describe('speech', () => {
  it('speechSynthesis がなければ利用不可・呼んでも落ちない', () => {
    uninstallSynth();
    expect(isSpeechAvailable()).toBe(false);
    expect(() => speakTrain(train)).not.toThrow();
    expect(() => stopSpeech()).not.toThrow();
  });

  it('なまえ→せつめい を日本語でゆっくりめに読み上げる(直前の読み上げは中断)', () => {
    const { speak, cancel } = installFakeSynth();
    expect(isSpeechAvailable()).toBe(true);
    speakTrain(train);
    expect(cancel).toHaveBeenCalled();
    expect(speak).toHaveBeenCalledTimes(1);
    const u = speak.mock.calls[0][0] as FakeUtterance;
    expect(u.text).toBe('はやぶさ。みどりの しんかんせんだよ。');
    expect(u.lang).toBe('ja-JP');
    expect(u.rate).toBeLessThan(1);
  });

  it('日本語ボイスがあれば選ぶ', () => {
    const ja = { lang: 'ja-JP' };
    const { speak } = installFakeSynth([{ lang: 'en-US' }, ja]);
    speakTrain(train);
    expect((speak.mock.calls[0][0] as FakeUtterance).voice).toBe(ja);
  });

  it('stopSpeech は読み上げを止める', () => {
    const { cancel } = installFakeSynth();
    stopSpeech();
    expect(cancel).toHaveBeenCalled();
  });
});
