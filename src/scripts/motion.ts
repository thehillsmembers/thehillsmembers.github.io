// Behaviour and motion.
// - Always: the phone menu, the header line after the hero, the forms, and dropping agenda
//   dates that have passed since the site was last published.
// - Only when the visitor hasn't asked for reduced motion: smooth scrolling (Lenis), section
//   headings revealed line by line, soft fades, the experience rules drawing in.
// The hero's entrance and the seal's slow turn are plain CSS (global.css, index.astro).
// Without JavaScript every word is simply on the page.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { SplitText } from 'gsap/SplitText';
import Lenis from 'lenis';

const root = document.documentElement;
const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Phone menu: close after choosing a link ──
const menu = document.querySelector<HTMLDetailsElement>('[data-menu]');
menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => (menu.open = false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu?.open) menu.open = false; });

// ── Header: once the hero has scrolled away (on pages without one, as soon as the page
//    scrolls) it gets its thin bottom line and the Apply circle moves inside the bar ──
const header = document.querySelector<HTMLElement>('[data-header]');
if (header) {
  const hero = document.querySelector<HTMLElement>('.hero');
  const update = () => {
    const past = hero ? hero.getBoundingClientRect().bottom <= header.offsetHeight : window.scrollY > 0;
    header.classList.toggle('is-solid', past);
  };
  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}

// ── Agenda: the site is built ahead of time, so dates that have passed since are removed
//    here. With none left, the section and its menu link go too. ──
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

// ── Motion ──
if (!reduce) {
  gsap.registerPlugin(ScrollTrigger, SplitText);
  root.classList.add('motion');

  // Smooth scrolling. Text boxes keep their own scrolling.
  const lenis = new Lenis({ prevent: (node: HTMLElement) => node.nodeName === 'TEXTAREA' });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((time) => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);

  // Links to a part of this page glide there and stop just under the header
  document.addEventListener('click', (e) => {
    if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    const a = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[href*="#"]');
    if (!a || a.classList.contains('skip-link')) return;
    const url = new URL(a.href);
    if (url.origin !== location.origin || url.pathname !== location.pathname || !url.hash) return;
    const target = document.getElementById(decodeURIComponent(url.hash.slice(1)));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target, { offset: -(header?.offsetHeight ?? 0) });
    history.pushState(null, '', url.hash);
  });

  // Section headings: split into the lines the browser draws, each rising out of its own mask.
  // autoSplit redoes the split when the fonts arrive or the width changes.
  gsap.utils.toArray<HTMLElement>('[data-split]').forEach((el) => {
    SplitText.create(el, {
      type: 'lines',
      mask: 'lines',
      linesClass: 'split-line',
      autoSplit: true,
      onSplit: (self) =>
        gsap.from(self.lines, {
          yPercent: 115,
          duration: 1.15,
          stagger: 0.12,
          ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 88%', once: true },
        }),
    });
  });

  // Small blocks: a short, soft rise
  gsap.set('[data-reveal]', { opacity: 0, y: 24 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 92%',
    once: true,
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power2.out', overwrite: true }),
  });

  // Experiences: each row's rule draws across, then its number, name and line rise
  const rows = gsap.utils.toArray<HTMLElement>('[data-row]');
  const parts = (row: HTMLElement) => row.querySelectorAll(':scope > :not(.rule)');
  rows.forEach((row) => {
    gsap.set(row.querySelectorAll('.rule'), { scaleX: 0 });
    gsap.set(parts(row), { opacity: 0, y: 18 });
  });
  ScrollTrigger.batch(rows, {
    start: 'top 90%',
    once: true,
    onEnter: (batch) => {
      const tl = gsap.timeline();
      (batch as HTMLElement[]).forEach((row, i) => {
        tl.to(row.querySelectorAll('.rule'), { scaleX: 1, duration: 1.3, ease: 'power3.inOut' }, i * 0.12)
          .to(parts(row), { opacity: 1, y: 0, duration: 0.9, stagger: 0.06, ease: 'power2.out' }, i * 0.12 + 0.35);
      });
    },
  });

  // Everything is in its starting place: let it show
  root.classList.add('motion-ready');

  // Re-measure when the page height changes (fonts arriving, a resize)
  let lastHeight = document.body.scrollHeight;
  let pending = 0;
  new ResizeObserver(() => {
    const h = document.body.scrollHeight;
    if (h === lastHeight) return;
    lastHeight = h;
    clearTimeout(pending);
    pending = window.setTimeout(() => ScrollTrigger.refresh(), 150);
  }).observe(document.body);
  window.addEventListener('load', () => ScrollTrigger.refresh());
}
