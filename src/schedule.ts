import type { PageDef } from './types';

/** Scroll length of the book opening, on the master timeline's scale. */
export const B = 260;
/** Length of the transition where one page swipes out while the next swipes in. */
export const T = 65;

/**
 * The ONE place where page timing is computed. The master timeline, the active-chapter dot
 * and the navigation all read from here, so they can never drift apart.
 *  starts[k] - where page k begins to slide in; it is fully in place at starts[k] + T.
 *  total     - length of the whole master timeline (= the pinned scroll distance, in %).
 */
export function schedule(pages: PageDef[]) {
  const starts: number[] = [];
  let s = B - T;
  for (const p of pages) {
    starts.push(s);
    s += p.scroll - T;
  }
  return { starts, total: s + T };
}

export type Schedule = ReturnType<typeof schedule>;

/** Timeline position where chapter `index` (0 = book, 1..n = pages) is settled and readable. */
export const chapterTime = (sch: Schedule, index: number) => (index <= 0 ? 0 : sch.starts[index - 1] + T + 1);

/** Which chapter is on screen at timeline position `t`: the next one takes over halfway through the swipe. */
export function chapterAt(sch: Schedule, t: number) {
  let ch = 0;
  sch.starts.forEach((s, k) => { if (t >= s + T / 2) ch = k + 1; });
  return ch;
}
