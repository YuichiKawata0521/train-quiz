import type { Train } from '../logic/types';

/**
 * Web Speech API による読み上げ。iPad は日本語ボイスを端末内蔵しているため
 * オフラインでも動く。非対応環境では何もしない。
 */
export function isSpeechAvailable(): boolean {
  return (
    typeof window !== 'undefined' &&
    !!window.speechSynthesis &&
    typeof window.SpeechSynthesisUtterance === 'function'
  );
}

/** なまえ→せつめい の順に、子ども向けにゆっくりめで読み上げる */
export function speakTrain(train: Train): void {
  if (!isSpeechAvailable()) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const utter = new window.SpeechSynthesisUtterance(
      `${train.name.hiragana}。${train.description}`,
    );
    utter.lang = 'ja-JP';
    utter.rate = 0.9;
    const ja = synth.getVoices().find((v) => v.lang.startsWith('ja'));
    if (ja) utter.voice = ja;
    synth.speak(utter);
  } catch {
    // 読み上げ失敗でアプリは止めない
  }
}

export function stopSpeech(): void {
  try {
    window.speechSynthesis?.cancel();
  } catch {
    // 同上
  }
}
