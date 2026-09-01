import { describe, it, expect, beforeEach } from 'vitest';
import {
  DEFAULT_SETTINGS,
  loadSettings,
  saveSettings,
  displayName,
} from '../src/logic/settings';
import type { Train } from '../src/logic/types';

beforeEach(() => localStorage.clear());

describe('loadSettings', () => {
  it('未保存ならデフォルトを返す', () => {
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it('保存した値を復元する', () => {
    saveSettings({ notation: 'normal', questionCount: 10, sound: false, adultMode: true });
    expect(loadSettings()).toEqual({
      notation: 'normal',
      questionCount: 10,
      sound: false,
      adultMode: true,
    });
  });
  it('壊れたJSONならデフォルトを返す', () => {
    localStorage.setItem('train-quiz-settings', '{oops');
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  });
  it('欠けたキーはデフォルトで補完する', () => {
    localStorage.setItem('train-quiz-settings', '{"sound":false}');
    expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, sound: false });
  });
});

describe('displayName', () => {
  const train: Train = {
    id: 'e5-hayabusa',
    name: { hiragana: 'はやぶさ', normal: 'はやぶさ(E5系)' },
    category: 'shinkansen',
    image: 'images/trains/e5-hayabusa.webp',
    description: 'てすとの せつめいだよ。',
  };
  it('表記設定に応じた名前を返す', () => {
    expect(displayName(train, 'hiragana')).toBe('はやぶさ');
    expect(displayName(train, 'normal')).toBe('はやぶさ(E5系)');
  });
});
