export function onLongPress(el: HTMLElement, ms: number, callback: () => void): void {
  let timer: ReturnType<typeof setTimeout> | null = null;
  const cancel = () => {
    if (timer) {
      clearTimeout(timer);
      timer = null;
    }
  };
  el.addEventListener('pointerdown', () => {
    cancel();
    timer = setTimeout(() => {
      timer = null;
      callback();
    }, ms);
  });
  for (const ev of ['pointerup', 'pointerleave', 'pointercancel']) {
    el.addEventListener(ev, cancel);
  }
}
