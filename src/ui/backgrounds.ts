import { asset } from './asset';

export const BG_VARIANTS = 5;

/** 問題画面の駅背景URL(問題番号で5種ループ) */
export function stationBg(index: number): string {
  return asset(`images/bg/station-${(index % BG_VARIANTS) + 1}.webp`);
}

/** 幕間走行の背景URL(5種ループ) */
export function runBg(index: number): string {
  return asset(`images/bg/run-${(index % BG_VARIANTS) + 1}.webp`);
}
