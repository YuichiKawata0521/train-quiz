import { describe, it, expect } from 'vitest';
import { stationBg, runBg } from '../src/ui/backgrounds';

describe('背景ローテーション', () => {
  it('駅背景は問題番号で5種をループする', () => {
    expect(stationBg(0)).toContain('images/bg/station-1.webp');
    expect(stationBg(4)).toContain('images/bg/station-5.webp');
    expect(stationBg(5)).toContain('images/bg/station-1.webp');
    expect(stationBg(9)).toContain('images/bg/station-5.webp');
  });
  it('走行背景も5種をループする', () => {
    expect(runBg(0)).toContain('images/bg/run-1.webp');
    expect(runBg(7)).toContain('images/bg/run-3.webp');
    expect(runBg(10)).toContain('images/bg/run-1.webp');
  });
});
