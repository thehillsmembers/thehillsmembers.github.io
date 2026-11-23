// Reads content/site.yaml (all text, dates, cities) and finds the photos and video
// dropped into public/. Nothing here needs editing to change the site's content.
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { parse } from 'yaml';
import raw from '../../content/site.yaml?raw';

const data = parse(raw);
const PUBLIC = join(process.cwd(), 'public');

export type Lang = 'en';
/** All the text for one language. A Portuguese version can be added later as `pt:` in the YAML. */
export function copy(lang: Lang = 'en') {
  return data[lang];
}

export const site = {
  instagramHandle: data.instagram_handle as string,
  instagramUrl: data.instagram_url as string,
  contactEmail: data.contact_email as string,
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

// ── Media found in public/ ─────────────────────────────────

const exists = (rel: string) => existsSync(join(PUBLIC, rel));

// The site can live at the root of a domain or under a sub-path (GitHub Pages: /seven-hills-site/).
const BASE = (import.meta.env.BASE_URL || '/').replace(/\/?$/, '/');
/** Turns a site path like "/apply/" or "/#agenda" into one that works wherever the site is hosted. */
export function link(path: string): string {
  return path.startsWith('/') ? BASE + path.slice(1) : path;
}

/** An image path from the YAML, only if the file is really there. */
export function image(rel?: string): string | null {
  return rel && exists(join('images', rel)) ? link(`/images/${rel}`) : null;
}

/** Escapes text and turns *one word* into <em>one word</em> for the serif italic. */
export function rich(text: string): string {
  const safe = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  return safe.replace(/\*([^*]+)\*/g, '<em>$1</em>');
}
