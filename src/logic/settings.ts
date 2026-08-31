import type { Settings, Train, Notation } from './types';

const STORAGE_KEY = 'train-quiz-settings';

export const DEFAULT_SETTINGS: Settings = {
  notation: 'hiragana',
  questionCount: 5,
  sound: true,
};

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function displayName(train: Train, notation: Notation): string {
  return notation === 'hiragana' ? train.name.hiragana : train.name.normal;
}
