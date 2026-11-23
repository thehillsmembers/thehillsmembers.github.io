// Behaviour, kept small: the phone menu, the header's row of links folding away on scroll, the
// message strip, the experiences carousel, agenda dates that have passed, and the forms.
// Without JavaScript every word is still on the page and the carousel scrolls by hand.

const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Phone menu: closes after choosing a link, with Escape, or when the screen turns wide ──
const menu = document.querySelector<HTMLDetailsElement>('[data-menu]');
menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => (menu.open = false)));
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && menu?.open) {
    menu.open = false;
    menu.querySelector('summary')?.focus();
  }
});
window.matchMedia('(min-width: 64rem)').addEventListener('change', (e) => {
  if (e.matches && menu) menu.open = false;
});

// ── Header: the row of links (wide screens) folds away once the page has scrolled a little ──
const header = document.querySelector<HTMLElement>('[data-header]');
if (header) {
  let folded = false;
  const update = () => {
    const now = window.scrollY > 24;
    if (now !== folded) header.classList.toggle('is-folded', (folded = now));
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
}

// ── Message strip: the lines take turns every five seconds (holding still under the mouse or
//    keyboard); the cross closes the strip for the rest of the visit ──
const promo = document.querySelector<HTMLElement>('[data-promo]');
if (promo) {
  const items = [...promo.querySelectorAll<HTMLElement>('[data-promo-item]')];
  let current = 0;
  let held = false;
  if (items.length > 1) {
    window.setInterval(() => {
      if (held || document.hidden || root.classList.contains('promo-closed')) return;
      items[current].classList.remove('is-active');
      current = (current + 1) % items.length;
      items[current].classList.add('is-active');
    }, 5000);
    promo.addEventListener('pointerenter', (e) => { if (e.pointerType === 'mouse') held = true; });
    promo.addEventListener('pointerleave', (e) => { if (e.pointerType === 'mouse') held = false; });
    promo.addEventListener('focusin', () => (held = true));
    promo.addEventListener('focusout', () => (held = false));
  }
  promo.querySelector('[data-promo-close]')?.addEventListener('click', () => {
    root.classList.add('promo-closed');
    try {
      sessionStorage.setItem('sh-promo-closed', '1');
    } catch {
      // private browsing: it stays closed on this page only
    }
  });
}

// ── Carousels: the arrows move a page of cards; the count follows the swipe ──
document.querySelectorAll<HTMLElement>('[data-carousel]').forEach((carousel) => {
  const track = carousel.querySelector<HTMLElement>('[data-track]');
  const prev = carousel.querySelector<HTMLButtonElement>('[data-prev]');
  const next = carousel.querySelector<HTMLButtonElement>('[data-next]');
  const count = carousel.querySelector<HTMLElement>('[data-count]');
  if (!track || !prev || !next || !count) return;
  const cards = [...track.children] as HTMLElement[];
  const step = () => (cards.length > 1 ? cards[1].offsetLeft - cards[0].offsetLeft : track.clientWidth);
  const perPage = () => Math.max(1, Math.round(track.clientWidth / step()));
  const pages = () => Math.ceil(cards.length / perPage());
  const page = () => {
    const end = track.scrollWidth - track.clientWidth;
    if (end > 0 && track.scrollLeft >= end - 2) return pages();
    return Math.min(pages(), Math.round(track.scrollLeft / (step() * perPage())) + 1);
  };
  let shown = count.textContent ?? '';
  const update = () => {
    const p = page();
    const n = pages();
    const text = `${p} / ${n}`;
    if (text !== shown) count.textContent = shown = text;
    prev.disabled = p <= 1;
    next.disabled = p >= n;
    carousel.classList.toggle('is-still', n <= 1);
  };
  const go = (direction: number) =>
    track.scrollBy({ left: direction * step() * perPage(), behavior: reduce ? 'auto' : 'smooth' });
  prev.addEventListener('click', () => go(-1));
  next.addEventListener('click', () => go(1));
  let frame = 0;
  track.addEventListener('scroll', () => {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(update);
  }, { passive: true });
  // Measured once the browser has laid the page out (and again whenever the width changes),
  // so opening the page never waits on it
  new ResizeObserver(update).observe(track);
});

// ── Agenda: the site is built ahead of time, so dates that have passed since are removed
//    here. With none left, the section and its menu links go too. ──
const pad = (n: number) => String(n).padStart(2, '0');
const now = new Date();
const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
document.querySelectorAll<HTMLElement>('[data-event-date]').forEach((row) => {
  if ((row.dataset.eventDate ?? '') < today) row.remove();
});
const agenda = document.querySelector('[data-agenda]');
const until = header?.dataset.agendaUntil;
if ((until && until < today) || (agenda && !agenda.querySelector('[data-event-date]'))) {
  agenda?.remove();
  document.querySelectorAll('a[href$="#agenda"]').forEach((a) => a.closest('li')?.remove());
}

// ── Formspree forms: send in the background, then show our own thank-you page ──
// (Without JavaScript the form still posts to Formspree, which shows its own confirmation.)
// Ticked boxes that share a name (experiences[]) are sent as one readable line: "A, B".
const tidy = (data: FormData) => {
  const body = new FormData();
  for (const [key, value] of data) {
    if (!key.endsWith('[]')) body.append(key, value);
    else if (!body.has(key.slice(0, -2))) body.append(key.slice(0, -2), data.getAll(key).join(', '));
  }
  return body;
};
document.querySelectorAll<HTMLFormElement>('form[data-formspree]').forEach((form) => {
  const error = form.querySelector<HTMLElement>('[data-form-error]');
  const button = form.querySelector<HTMLButtonElement>('button[type="submit"]');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (error) error.hidden = true;
    if (button) button.disabled = true;
    try {
      const res = await fetch(form.action, { method: 'POST', body: tidy(new FormData(form)), headers: { Accept: 'application/json' } });
      if (!res.ok) throw new Error(String(res.status));
      window.location.href = form.dataset.thanks || '/';
    } catch {
      if (error) error.hidden = false;
      if (button) button.disabled = false;
    }
  });
});
