import type { PageDef, PanelDef } from './types';

/**
 * Pinned "one stage" mode: the window has to be wide AND tall enough for the panel text.
 * A landscape phone (e.g. 900 x 400) is wide but far too short, so it gets the stacked layout.
 * Keep in sync with the media queries in styles.css (they use the same numbers).
 */
export const DESK_MQ = '(min-width: 900px) and (min-height: 560px)';
export const MOTION_MQ = '(prefers-reduced-motion: no-preference)';

/** Width / height of the sheet in desktop mode (`aspect-ratio` of `.sheet` in styles.css). */
const SHEET_RATIO = 1.52;
/** The staircase art is 572 x 1024; the climb panel uses exactly this ratio when stacked, so nothing is cropped. */
const STAIRS_RATIO = '572 / 1024';

const fr = (s: string) => s.trim().split(/\s+/).map(parseFloat);

/** Width / height that panel `area` has in the desktop grid of page `pg`. */
export function gridAspect(pg: PageDef, area: string) {
  const cols = fr(pg.cols);
  const rows = fr(pg.rows);
  const map = pg.d.split("'").map((r) => r.trim()).filter(Boolean).map((r) => r.split(/\s+/));
  const cs = new Set<number>();
  const rs = new Set<number>();
  map.forEach((line, r) => line.forEach((a, c) => { if (a === area) { rs.add(r); cs.add(c); } }));
  if (!cs.size || !rs.size) return 4 / 3;
  const sum = (arr: number[], set: Set<number>) => [...set].reduce((t, i) => t + (arr[i] ?? 0), 0);
  const w = (sum(cols, cs) / sum(cols, new Set(cols.keys()))) * SHEET_RATIO;
  const h = sum(rows, rs) / sum(rows, new Set(rows.keys()));
  return w / h;
}

/**
 * `aspect-ratio` of a panel in the stacked (phone) layout. It follows the desktop composition, but is kept between
 * square and 1.8:1 so a panel is never a huge tall strip or a thin ribbon, and the CTA panel always has room for its buttons.
 */
export function stackRatio(pg: PageDef, p: PanelDef) {
  if (p.items.some((i) => i.k === 'title')) return '3 / 1';
  if (p.items.some((i) => i.k === 'climb')) return STAIRS_RATIO;
  return Math.min(1.8, Math.max(1, gridAspect(pg, p.a))).toFixed(2);
}
