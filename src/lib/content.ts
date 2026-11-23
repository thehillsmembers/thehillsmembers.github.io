// Reads content/site.yaml (all text, dates, cities, form addresses).
// Nothing here needs editing to change the site's content.
import { parse } from 'yaml';
import raw from '../../content/site.yaml?raw';

const data = parse(raw);

export type Lang = 'en';
/** All the text for one language. A Portuguese version can be added later as `pt:` in the YAML. */
export function copy(lang: Lang = 'en') {
  return data[lang];
}

export const site = {
  instagramHandle: data.instagram_handle as string,
  instagramUrl: data.instagram_url as string,
  cities: (data.cities ?? []) as string[],
  /** Formspree addresses for the forms. Empty = use Netlify Forms. */
  forms: { apply: (data.forms?.apply ?? '') as string, partners: (data.forms?.partners ?? '') as string },
};

// ── Agenda ────────────────────────────────────────────────

export type AgendaItem = {
  date: string;
  format: string;
  city: string;
  edition?: number | string;
  time?: string;
  note?: string;
  weekday: string;
};

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Events from today onwards, soonest first. */
export function upcoming(): AgendaItem[] {
  const today = new Date().toISOString().slice(0, 10);
  return ((data.agenda ?? []) as Omit<AgendaItem, 'weekday'>[])
    .map((e) => {
      const d = (e.date as unknown) instanceof Date ? (e.date as unknown as Date).toISOString() : String(e.date);
      const date = d.slice(0, 10);
      return { ...e, date, weekday: WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()] };
    })
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/** 2027-03-07 → 07.03 */
export function shortDate(iso: string) {
  const [, m, d] = iso.split('-');
  return `${d}.${m}`;
}

// ── Links ──────────────────────────────────────────────────

// The site can live at the root of a domain or under a sub-path (GitHub Pages: /seven-hills-site/).
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
/** Turns a site path like "/apply/" or "/#agenda" into one that works wherever the site is hosted. */
export function link(path: string): string {
  return path.startsWith('/') ? BASE + path.slice(1) : path;
}

/** Escapes text and turns *one word* into <em>one word</em> for the serif italic. */
export function rich(text: string): string {
  const safe = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
