// Behaviour and subtle motion.
// - The experiences slider (arrows, mouse drag; swipe is native on phones) and the phone
//   menu always work.
// - Motion (lines sliding up, gentle fades, photos easing their zoom on scroll, the
//   seven dots lighting up) runs only when the visitor hasn't asked for reduced motion.
// Without JavaScript every word and photo is simply on the page.
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

// ── Phone menu: close after choosing a link ──
const menu = document.querySelector<HTMLDetailsElement>('[data-menu]');
menu?.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => (menu.open = false)));
document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && menu?.open) menu.open = false; });

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

// ── Experiences slider ──
document.querySelectorAll<HTMLElement>('[data-slider]').forEach((slider) => {
  const track = slider.querySelector<HTMLElement>('[data-slides]')!;
  const prev = slider.querySelector<HTMLButtonElement>('[data-prev]')!;
  const next = slider.querySelector<HTMLButtonElement>('[data-next]')!;
  const nav = slider.querySelector<HTMLElement>('[data-slider-nav]')!;
  const step = () => (track.querySelector<HTMLElement>('.card')?.offsetWidth ?? 300) + 24;
  const behavior: ScrollBehavior = reduce ? 'auto' : 'smooth';

  const update = () => {
    const max = track.scrollWidth - track.clientWidth;
    nav.hidden = max <= 2;
    prev.disabled = track.scrollLeft <= 2;
    next.disabled = track.scrollLeft >= max - 2;
  };
  prev.addEventListener('click', () => track.scrollBy({ left: -step(), behavior }));
  next.addEventListener('click', () => track.scrollBy({ left: step(), behavior }));
  track.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
  update();

  // keyboard: arrow keys when the slider has focus
  track.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); next.click(); }
    if (e.key === 'ArrowLeft') { e.preventDefault(); prev.click(); }
  });

  // mouse drag (touch already swipes natively)
  let down = false, startX = 0, startLeft = 0, moved = 0;
  track.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    down = true; moved = 0;
    startX = e.clientX; startLeft = track.scrollLeft;
  });
  window.addEventListener('pointermove', (e) => {
    if (!down) return;
    const dx = e.clientX - startX;
    moved = Math.max(moved, Math.abs(dx));
    if (moved > 4) track.classList.add('is-dragging');
    track.scrollLeft = startLeft - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!down) return;
    down = false;
    if (!track.classList.contains('is-dragging')) return;
    track.classList.remove('is-dragging');
    // settle on the nearest card
    const s = step();
    track.scrollTo({ left: Math.round(track.scrollLeft / s) * s, behavior });
  });
});

// ── Motion ──
if (!reduce) {
  gsap.registerPlugin(ScrollTrigger);
  document.documentElement.classList.add('motion');

  // Big headings: each line slides up from below its own edge
  gsap.utils.toArray<HTMLElement>('[data-lines]').forEach((heading) => {
    const lines = heading.querySelectorAll('.line > span');
    gsap.set(lines, { yPercent: 105 });
    ScrollTrigger.create({
      trigger: heading,
      start: 'top 88%',
      once: true,
      onEnter: () => gsap.to(lines, { yPercent: 0, duration: 1.1, stagger: 0.12, ease: 'power3.out' }),
    });
  });

  // Small blocks: a short, soft rise
  gsap.set('[data-reveal]', { opacity: 0, y: 24 });
  ScrollTrigger.batch('[data-reveal]', {
    start: 'top 92%',
    once: true,
    onEnter: (batch) => gsap.to(batch, { opacity: 1, y: 0, duration: 0.9, stagger: 0.08, ease: 'power2.out', overwrite: true }),
  });

  // Photos: settle from a slight zoom as they move through the screen
  gsap.utils.toArray<HTMLElement>('[data-zoom]').forEach((frame) => {
    const img = frame.querySelector('img');
    if (!img) return;
    gsap.fromTo(img, { scale: 1.12 }, {
      scale: 1,
      ease: 'none',
      scrollTrigger: { trigger: frame, start: 'top bottom', end: 'bottom 40%', scrub: true },
    });
  });

  // Cities: the seven dots light up one after another
  document.querySelectorAll<HTMLElement>('[data-route]').forEach((route) => {
    const dots = route.querySelectorAll('.dot');
    const line = route.querySelector('.dots-line');
    const tl = gsap.timeline({ scrollTrigger: { trigger: route, start: 'top 85%', once: true } });
    tl.from(line, { scaleX: 0, duration: 1.4, ease: 'power2.inOut' })
      .from(dots, { scale: 0, duration: 0.4, stagger: 0.16, ease: 'back.out(2.5)' }, 0.1);
  });

  // Re-measure when photos finish loading or the page height changes
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
