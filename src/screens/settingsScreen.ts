import type { AppContext } from '../app';
import { saveSettings } from '../logic/settings';

export function renderSettingsScreen(ctx: AppContext): void {
  const s = ctx.settings;
  const credits = ctx.trains.filter((t) => t.credit);
  ctx.root.innerHTML = `
    <section class="screen screen-settings">
      <h2 class="heading">せってい(おうちのひとよう)</h2>
      <div class="setting-row">
        <span class="setting-label">もじ</span>
        <label><input type="radio" name="notation" value="hiragana" ${s.notation === 'hiragana' ? 'checked' : ''}> ひらがな</label>
        <label><input type="radio" name="notation" value="normal" ${s.notation === 'normal' ? 'checked' : ''}> ふつう</label>
      </div>
      <div class="setting-row">
        <span class="setting-label">もんだいのかず</span>
        ${[5, 7, 10]
          .map(
            (n) =>
              `<label><input type="radio" name="count" value="${n}" ${s.questionCount === n ? 'checked' : ''}> ${n}もん</label>`,
          )
          .join('')}
      </div>
      <div class="setting-row">
        <span class="setting-label">おと</span>
        <label><input type="checkbox" name="sound" ${s.sound ? 'checked' : ''}> オン</label>
      </div>
      <details class="credits">
        <summary>しゃしんのクレジット(${credits.length}けん)</summary>
        <ul>
          ${credits
            .map(
              (t) =>
                `<li>${t.name.normal} — ${t.credit!.author}(${t.credit!.license})<a href="${t.credit!.source}" target="_blank" rel="noreferrer">出典</a></li>`,
            )
            .join('')}
        </ul>
      </details>
      <button class="btn btn-back" data-action="back">もどる</button>
    </section>`;

  ctx.root.querySelector<HTMLElement>('.screen-settings')!.addEventListener('change', (e) => {
    const input = e.target as HTMLInputElement;
    if (input.name === 'notation') ctx.settings.notation = input.value as 'hiragana' | 'normal';
    if (input.name === 'count') ctx.settings.questionCount = Number(input.value) as 5 | 7 | 10;
    if (input.name === 'sound') ctx.settings.sound = input.checked;
    saveSettings(ctx.settings);
  });
  ctx.root.querySelector<HTMLButtonElement>('[data-action=back]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    ctx.navigate('start');
  });
}
