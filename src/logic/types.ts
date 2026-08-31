export type Category = 'shinkansen' | 'express' | 'local';

export interface TrainName {
  hiragana: string;
  normal: string;
}

export interface Credit {
  author: string;
  license: string;
  source: string;
}

export interface Train {
  id: string;
  name: TrainName;
  category: Category;
  image: string;
  credit?: Credit;
  lookalikes?: string[];
}

export interface Mode {
  id: string;
  label: TrainName;
  categories: Category[];
  heroTrain: string;
}

export type Notation = 'hiragana' | 'normal';

export interface Settings {
  notation: Notation;
  questionCount: 5 | 7 | 10;
  sound: boolean;
  /** おとなモード: 1日のプレイ時間制限を無効化する */
  adultMode: boolean;
}
