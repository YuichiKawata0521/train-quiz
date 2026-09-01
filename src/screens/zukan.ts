import type { AppContext } from '../app';
import type { Category } from '../logic/types';
import { asset } from '../ui/asset';
import { buildAlbum, CATEGORY_ORDER, type Slot } from '../logic/zukanAlbum';
import { loadZukanCounts, UNLOCK_COUNT, unlockedCount, loadSeen, markSeen } from '../logic/zukan';
import { openTrainCard, trainVoice } from '../ui/trainCard';

const TAB_LABELS: Record<Category, string> = {
  shinkansen: 'しんかんせん',
  express: 'とっきゅう',
  local: 'ふつうでんしゃ',
};

export function renderZukan(ctx: AppContext): void {
  const album = buildAlbum(ctx.trains);
  const counts = loadZukanCounts();
  // 解禁済みだがまだ図鑑でお披露目していない電車(この訪問中はキラキラし続ける)
  const seen = loadSeen();
  const fresh = new Set(
    ctx.trains
      .filter((t) => (counts[t.id] ?? 0) >= UNLOCK_COUNT && !seen.has(t.id))
      .map((t) => t.id),
  );
  // 新入りがいれば、最初の新入りが載っている見開きを自動で開く
  let current = 0;
  if (fresh.size > 0) {
    const found = album.spreads.findIndex((s) =>
      [...s.left, ...s.right].some((t) => t !== null && fresh.has(t.id)),
    );
    if (found >= 0) current = found;
  }

  ctx.root.innerHTML = `
    <section class="screen screen-zukan">
      <div class="zukan-album"
           style="background-image:url(${asset('images/zukan/album.webp')})">
        <div class="zukan-page zukan-page-left"></div>
        <div class="zukan-page zukan-page-right"></div>
        <div class="zukan-tabs">
          ${CATEGORY_ORDER.map(
            (c) => `<button class="zukan-tab" data-cat="${c}">${TAB_LABELS[c]}</button>`,
          ).join('')}
        </div>
      </div>
      <button class="zukan-nav zukan-prev" aria-label="まえのページ">◀</button>
      <button class="zukan-nav zukan-next" aria-label="つぎのページ">▶</button>
      <div class="zukan-counter">あつめた ${unlockedCount(ctx.trains)}/${ctx.trains.length}</div>
      <button class="btn btn-back" data-action="back">もどる</button>
    </section>`;

  const albumEl = ctx.root.querySelector<HTMLElement>('.zukan-album')!;
  const left = ctx.root.querySelector<HTMLElement>('.zukan-page-left')!;
  const right = ctx.root.querySelector<HTMLElement>('.zukan-page-right')!;
  const prevBtn = ctx.root.querySelector<HTMLButtonElement>('.zukan-prev')!;
  const nextBtn = ctx.root.querySelector<HTMLButtonElement>('.zukan-next')!;
  const tabs = [...ctx.root.querySelectorAll<HTMLButtonElement>('.zukan-tab')];

  function slotHtml(slot: Slot): string {
    if (!slot) return '<div class="zukan-slot zukan-empty"></div>';
    const count = counts[slot.id] ?? 0;
    if (count >= UNLOCK_COUNT) {
      return `
        <button class="zukan-slot zukan-unlocked${fresh.has(slot.id) ? ' zukan-fresh' : ''}" data-train="${slot.id}">
          <span class="zukan-photo"><img src="${asset(slot.image)}" alt=""></span>
          <span class="zukan-name">${slot.name.hiragana}</span>
        </button>`;
    }
    return `
      <div class="zukan-slot zukan-locked">
        <span class="zukan-photo"><img src="${asset(slot.image)}" alt=""></span>
        <span class="zukan-stamps">${Array.from(
          { length: UNLOCK_COUNT },
          (_, i) => `<span class="stamp${i < count ? ' on' : ''}">★</span>`,
        ).join('')}</span>
      </div>`;
  }

  function currentCategory(): Category {
    let cat: Category = CATEGORY_ORDER[0];
    for (const c of CATEGORY_ORDER) {
      if (album.categoryStart[c] <= current) cat = c;
    }
    return cat;
  }

  function renderSpread(): void {
    const spread = album.spreads[current];
    left.innerHTML = spread.left.map(slotHtml).join('');
    right.innerHTML = spread.right.map(slotHtml).join('');
    prevBtn.disabled = current === 0;
    nextBtn.disabled = current === album.spreads.length - 1;
    const cat = currentCategory();
    for (const tab of tabs) tab.classList.toggle('active', tab.dataset.cat === cat);
    for (const el of ctx.root.querySelectorAll<HTMLButtonElement>('.zukan-unlocked')) {
      el.addEventListener('click', () => openDetail(el.dataset.train!));
    }
    // この見開きに載った新入りはお披露目済みにする(キラキラは次の訪問から消える)
    markSeen(
      [...spread.left, ...spread.right]
        .filter((t): t is NonNullable<Slot> => t !== null)
        .map((t) => t.id)
        .filter((id) => fresh.has(id)),
    );
  }

  function openDetail(id: string): void {
    const t = ctx.trains.find((tr) => tr.id === id)!;
    ctx.audio.play('tap');
    openTrainCard(ctx.root, {
      train: t,
      closeLabel: 'とじる',
      voice: trainVoice(ctx, t),
      onTap: () => ctx.audio.play('tap'),
      onClose: () => {},
    });
  }

  function turnTo(index: number): void {
    ctx.audio.play('tap');
    current = index;
    albumEl.classList.remove('zukan-turning');
    void albumEl.offsetWidth; // アニメ再トリガー用の reflow
    albumEl.classList.add('zukan-turning');
    renderSpread();
  }
  prevBtn.addEventListener('click', () => {
    if (current > 0) turnTo(current - 1);
  });
  nextBtn.addEventListener('click', () => {
    if (current < album.spreads.length - 1) turnTo(current + 1);
  });
  for (const tab of tabs) {
    tab.addEventListener('click', () => turnTo(album.categoryStart[tab.dataset.cat as Category]));
  }
  ctx.root.querySelector<HTMLButtonElement>('[data-action=back]')!.addEventListener('click', () => {
    ctx.audio.play('tap');
    ctx.navigate('gameSelect');
  });

  renderSpread();
}
