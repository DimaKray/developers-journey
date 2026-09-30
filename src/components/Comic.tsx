import { useRef, useState, useEffect, useCallback, useMemo, type CSSProperties } from 'react';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { useGSAP } from '@gsap/react';
import type { Item, Mark, PageDef, PanelDef } from '../types';
import { profile } from '../config';
import { sound } from '../sound';
import { B, T, schedule, chapterAt, chapterTime } from '../schedule';
import { DESK_MQ, MOTION_MQ, stackRatio } from '../layout';
import { lenis } from '../hooks/useLenis';
import { ChapterNav } from './ChapterNav';
import { ProjectsModal } from './ProjectsModal';
import { CursorTrail } from './CursorTrail';

gsap.registerPlugin(ScrollTrigger, useGSAP);

const asset = (f: string) => `/assets/${f}`;
const NS = 'http://www.w3.org/2000/svg';
// Centre line of the staircase in bg-stairs.webp (572 x 1024), bottom to top.
const PATH = 'M190 1000L250 950L300 905L360 865L430 825L470 800L455 775L400 752L330 730L250 708L170 680L110 650L100 630L130 612L200 590L280 560L360 530L430 510L445 500L420 485L350 470L280 445L210 415L170 402L195 385L260 372L330 350L395 332L400 322L375 310L320 288L260 272L225 262L245 248L300 235L345 217L355 205L335 188L285 170L250 150L245 138L265 122L300 108L305 95L292 78';
const ROT = [0, 0, 0, 0, 0]; // crisp, straight grid panels with zero overlap
const ENTER = [{ scale: 0.95, y: 14 }, { xPercent: -6, yPercent: 4 }, { yPercent: 12 }, { xPercent: 6, yPercent: 4 }, { scale: 0.95, y: -12 }]; // gentle, smooth entrance

let climbPath: SVGPathElement | null = null;
const getPath = () => {
  if (!climbPath) {
    climbPath = document.createElementNS(NS, 'path');
    climbPath.setAttribute('d', PATH);
  }
  return climbPath;
};
const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), Math.max(lo, hi));

/**
 * Puts the hero and the skill marks of a climb layer at progress p (0..1) along the staircase.
 * The art is object-fit: cover, so on a panel that is not exactly the art's shape a slice of it is cropped and the path
 * can leave the frame. Whatever the panel shape, the hero and the marks are kept inside the panel.
 */
function placeClimb(el: HTMLElement, marks: Mark[], p: number) {
  const hero = el.querySelector<HTMLElement>('.js-hero');
  const dots = Array.from(el.querySelectorAll<HTMLElement>('.js-mark'));
  const path = getPath();
  const len = path.getTotalLength();
  // The art is object-fit: cover, so map image coordinates (572 x 1024) into the panel the same way.
  const w = el.offsetWidth || 300, h = el.offsetHeight || 400;
  const k = Math.max(w / 572, h / 1024), ox = (w - 572 * k) / 2, oy = (h - 1024 * k) / 2;
  const pt = path.getPointAtLength(p * len);
  if (hero) {
    const sc = 1 - 0.5 * p;
    const hw = hero.offsetWidth * sc, hh = hero.offsetHeight * sc; // layout size (transforms are not included), scaled by hand
    gsap.set(hero, { xPercent: -50, yPercent: -100, x: clamp(ox + pt.x * k, hw / 2, w - hw / 2), y: clamp(oy + pt.y * k, hh, h), scale: sc });
  }
  dots.forEach((d, j) => {
    const m = path.getPointAtLength(marks[j].f * len);
    gsap.set(d, { xPercent: -50, yPercent: -100, x: clamp(ox + m.x * k, d.offsetWidth / 2, w - d.offsetWidth / 2), y: clamp(oy + (m.y - 30) * k, d.offsetHeight, h) });
  });
}

const ordered = (items: Item[]) => [...items.filter((i) => !i.over), ...items.filter((i) => i.over)];
const origin = (it: Item) => (it.k === 'actor' ? `${it.x}% ${100 - it.b - it.h / 2}%` : it.k === 'sfx' ? `${it.x}% ${it.y}%` : '50% 50%');

/** Tells the CSS the sprite's width / height, so it can size and place the sprite inside a panel of any shape. */
function reportAspect(img: HTMLImageElement | null) {
  if (!img) return;
  const apply = () => { if (img.naturalWidth) img.style.setProperty('--ar', String(img.naturalWidth / img.naturalHeight)); };
  if (img.complete) apply();
  else img.addEventListener('load', apply, { once: true });
}

function SoundToggle() {
  const [muted, setMuted] = useState(sound.isMuted());

  useEffect(() => {
    return sound.subscribe((m) => setMuted(m));
  }, []);

  return (
    <button
      type="button"
      className={`sound-toggle ${muted ? 'sound-toggle--muted' : 'sound-toggle--active'}`}
      onClick={() => sound.toggleMute()}
      title={muted ? 'Увімкнути звук (M)' : 'Вимкнути звук (M)'}
      aria-label={muted ? 'Увімкнути звук' : 'Вимкнути звук'}
    >
      <span className="sound-toggle__icon" aria-hidden="true">{muted ? '🔇' : '🔊'}</span>
      <span className="sound-toggle__label">{muted ? 'Звук: вимк' : 'Звук: увімк'}</span>
      {!muted && <span className="sound-toggle__pulse" aria-hidden="true" />}
    </button>
  );
}

function ItemView({
  it,
  marks = [],
  onOpenProjects,
  copyState = 'idle',
  onCopyEmail,
}: {
  it: Item;
  marks?: Mark[];
  onOpenProjects?: () => void;
  copyState?: 'idle' | 'ok' | 'fail';
  onCopyEmail?: () => void;
}) {
  switch (it.k) {
    case 'actor':
      // Position and size go to the CSS as variables; the stylesheet keeps the whole sprite inside its panel (see `.actor`).
      return <img ref={reportAspect} className={`actor actor--${it.s.replace(/\.[a-zA-Z]+$/, '')}`} src={asset(it.s)} alt={it.alt} style={{ '--x': it.x, '--b': it.b, '--h': it.h } as CSSProperties} />;
    case 'sfx':
      return <span className="sfx" aria-hidden="true" style={{ left: `${it.x}%`, top: `${it.y}%`, color: it.c, rotate: `${it.r}deg` }}>{it.t}</span>;
    case 'box':
      return <p className="box" style={{ left: `${it.x}%`, top: `${it.y}%`, width: `${it.w}%` }}>{it.t}</p>;
    case 'type':
      return <pre className={`term term--${it.tone}`} style={{ left: `${it.x}%`, top: `${it.y}%`, width: `${it.w}%` }}><code className="js-type">{it.l.join('\n')}</code></pre>;
    case 'title':
      return <h2 className="title"><span>{it.n}</span><span className="title__text">{it.t}</span></h2>;
    case 'climb':
      return (
        <>
          {marks.map((m) => <img key={m.i} className="mark js-mark" src={asset(`icon-${m.i}.webp`)} alt="" />)}
          <img className="hero js-hero" src={asset(it.s)} alt="Розробник піднімається сходами" />
        </>
      );
    case 'legend':
      return <ul className="legend">{marks.map((m) => <li key={m.i} className="js-skill"><img src={asset(`icon-${m.i}.webp`)} alt="" />{m.l}</li>)}</ul>;
    case 'cta':
      return (
        <div className="cta">
          <p className="bubble">{it.t}</p>
          <div className="cta__actions">
            <div className="cta__email-group">
              <a className="cta__btn cta__btn--mail" href={`mailto:${profile.email}`}>
                <span className="cta__icon" aria-hidden="true">✉</span>
                <span className="cta__text">{profile.email}</span>
              </a>
              <button
                type="button"
                className="cta__btn cta__btn--copy"
                onClick={onCopyEmail}
                title="Скопіювати Email"
                aria-label="Скопіювати Email"
              >
                <span>{copyState === 'ok' ? '✓' : copyState === 'fail' ? '✕' : '📋'}</span>
                {copyState !== 'idle' && <span className="cta__copied-bubble" role="status">{copyState === 'ok' ? 'Скопійовано! ✓' : 'Не вдалося. Скопіюй вручну'}</span>}
              </button>
            </div>

            <div className="cta__row">
              {onOpenProjects && (
                <button
                  type="button"
                  className="cta__btn cta__btn--projects"
                  onClick={onOpenProjects}
                >
                  <span>⭐ Мої проекти</span>
                </button>
              )}
              {profile.resumeUrl && profile.resumeUrl !== '#' && (
                <a
                  className="cta__btn cta__btn--resume"
                  href={profile.resumeUrl}
                  target="_blank"
                  rel="noreferrer"
                >
                  <span>📄 Резюме</span>
                </a>
              )}
            </div>

            <div className="cta__links">
              {profile.links.map((l) => (
                <a key={l.label} className="cta__link" href={l.href} target="_blank" rel="noreferrer">
                  <span className="cta__bullet">✦</span> {l.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      );
  }
}

/** Story time -> timeline time. `P` maps a moment (0..1 on the page), `D` a duration, `end` is where the page's timeline stops. */
type Clock = { P: (at: number) => number; D: (d: number) => number; end: number };

/** Adds one panel of a page to a timeline. `restore` collects cleanup callbacks that run when the timeline is reverted. */
function buildPanel(tl: gsap.core.Timeline, sheet: HTMLElement, cell: HTMLElement, pg: PageDef, pa: PanelDef, pi: number, { P, D, end }: Clock, restore: (() => void)[]) {
  const marks = pg.marks ?? [];
  const climb = pg.panels.flatMap((p) => p.items).find((i) => i.k === 'climb') as Extract<Item, { k: 'climb' }> | undefined;
  const rr = ROT[(pi + pg.id.length) % 5];
  const enterVars = ENTER[pi % 5];

  // Smooth panel entrance
  tl.fromTo(cell, { opacity: 0, rotate: rr, ...enterVars }, { opacity: 1, rotate: rr, scale: 1, xPercent: 0, yPercent: 0, y: 0, duration: D(0.14), ease: 'power2.out' }, P(pa.at));
  tl.fromTo(cell.querySelector('.js-flash'), { opacity: 0.35 }, { opacity: 0, duration: D(0.1), ease: 'power1.out' }, P(pa.at) + D(0.02));
  
  const bg = cell.querySelector('.js-bg');
  if (bg && pa.z) {
    tl.fromTo(bg, { scale: pa.z[0] }, { scale: pa.z[1], duration: end - P(pa.at), ease: 'power1.out' }, P(pa.at));
  }
  if (pa.sh !== undefined) {
    tl.to(cell, { keyframes: [{ x: -6 }, { x: 5 }, { x: -3 }, { x: 2 }, { x: 0 }], duration: D(0.08) }, P(pa.sh));
    tl.to(sheet, { keyframes: [{ x: -4, y: 2 }, { x: 3, y: -2 }, { x: -2, y: 1 }, { x: 0, y: 0 }], duration: D(0.08) }, P(pa.sh));
    const speed = cell.querySelector('.js-speed');
    if (speed) {
      tl.fromTo(speed, { opacity: 0, scale: 0.6 }, { opacity: 0.7, scale: 1.05, duration: D(0.06), ease: 'power2.out' }, P(pa.sh));
      tl.to(speed, { opacity: 0, duration: D(0.1) }, P(pa.sh) + D(0.06));
    }
  }

  const layers = Array.from(cell.querySelectorAll<HTMLElement>('.js-layer'));
  ordered(pa.items).forEach((it, i) => {
    const el = layers[i];
    if (!el) return;

    if (it.k === 'actor') {
      // xPercent / yPercent of the layer get baked into px when GSAP re-reads the transform (refresh, resize), and the
      // character stays shifted out of its panel. So the shift is animated as CSS variables that `.actor` turns into `translate`.
      const split = (v: Record<string, number>) => {
        const { xPercent = 0, yPercent = 0, ...rest } = v;
        return { ...rest, '--dx': xPercent, '--dy': yPercent };
      };
      tl.fromTo(el, split(it.from as Record<string, number>), { ...split(it.to as Record<string, number>), duration: D(it.d), ease: 'power2.out' }, P(it.at));
      if (it.s.includes('sword')) {
        tl.call(() => sound.playSwordChime(), [], P(it.at) + D(it.d * 0.3));
      } else if (it.s.includes('monster') && pg.id === 'boss' && pa.a === 'a') {
        tl.call(() => sound.playMonsterGrowl(), [], P(it.at) + D(0.05));
      } else if (it.s.includes('summit')) {
        tl.call(() => sound.playSummitFanfare(), [], P(it.at) + D(0.1));
      }
    } else if (it.k === 'sfx') {
      tl.fromTo(el, { scale: 0.4, opacity: 0 }, { scale: 1, opacity: 1, duration: D(0.12), ease: 'back.out(1.8)' }, P(it.at));
      if (it.t.includes('ЕВРИКА')) {
        tl.call(() => sound.playSwordChime(), [], P(it.at));
      } else if (it.t.includes('ТРЕСЬ')) {
        tl.call(() => sound.playThud(), [], P(it.at));
      } else if (it.t.includes('БУМ')) {
        tl.call(() => sound.playSwordSlash(), [], P(it.at));
      }
    } else if (it.k === 'box') {
      tl.fromTo(el, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: D(0.12), ease: 'power2.out' }, P(it.at));
    } else if (it.k === 'type') {
      const txt = el.querySelector('.js-type') as HTMLElement;
      const full = it.l.join('\n');
      const o = { n: 0 };
      if (txt) {
        txt.textContent = '';
        restore.push(() => { txt.textContent = full; });
        tl.fromTo(el, { opacity: 0 }, { opacity: 1, duration: D(0.04) }, P(it.at));
        let lastCount = 0;
        tl.to(o, {
          n: full.length,
          duration: D(it.d),
          onUpdate: () => {
            const cur = Math.round(o.n);
            if (cur > lastCount) {
              sound.playTyping();
              lastCount = cur;
            }
            txt.textContent = full.slice(0, cur);
          }
        }, P(it.at));
        if (it.tone === 'red') {
          tl.call(() => sound.playErrorGlitch(), [], P(it.at) + D(0.06));
        }
      }
    } else if (it.k === 'climb') {
      const dots = Array.from(el.querySelectorAll<HTMLElement>('.js-mark'));
      const o = { p: 0 };
      const place = () => placeClimb(el, marks, o.p);
      place();
      // The panel changes size on resize / rotation and the hero image may load late: put the hero back on the stairs.
      ScrollTrigger.addEventListener('refresh', place);
      restore.push(() => ScrollTrigger.removeEventListener('refresh', place));
      el.querySelector('.js-hero')?.addEventListener('load', place, { once: true });
      tl.to(o, { p: 1, duration: D(it.d), onUpdate: place }, P(it.at));
      dots.forEach((d, j) => {
        const markTime = P(it.at + it.d * marks[j].f);
        tl.fromTo(d, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: D(0.06), ease: 'back.out(1.8)' }, markTime);
        tl.call(() => sound.playSkillPing(j), [], markTime);
      });
    } else if (it.k === 'legend' && climb) {
      const skills = el.querySelectorAll('.js-skill');
      skills.forEach((sk, j) => tl.fromTo(sk, { opacity: 0, x: -14 }, { opacity: 1, x: 0, duration: D(0.08), ease: 'power2.out' }, P(climb.at + climb.d * marks[j].f)));
    }
  });
}

/** Desktop: adds one comic page to the master timeline. s = start, L = length, K = share of L used by the panels (the rest is reading time). */
function buildPage(tl: gsap.core.Timeline, sheet: HTMLElement, pg: PageDef, s: number, L: number, K: number, restore: (() => void)[]) {
  const clock: Clock = { P: (at) => s + at * L * K, D: (d) => d * L * K, end: s + L };
  const cells = Array.from(sheet.querySelectorAll<HTMLElement>('.js-cell'));
  pg.panels.forEach((pa, pi) => { if (cells[pi]) buildPanel(tl, sheet, cells[pi], pg, pa, pi, clock, restore); });
}

/**
 * Stacked layout (phones, small windows): every panel plays on its own, once, when it scrolls into view.
 * It is not tied to the scroll position of the whole page, so a character can never be animated while its panel is
 * off screen (which is what happened when one long scrub covered a tall column of panels).
 */
function buildStack(sheet: HTMLElement, pg: PageDef, restore: (() => void)[]) {
  const cells = Array.from(sheet.querySelectorAll<HTMLElement>('.js-cell'));
  pg.panels.forEach((pa, pi) => {
    const cell = cells[pi];
    if (!cell) return;
    const dur = pa.items.some((i) => i.k === 'climb') ? 5.5 : 3.2; // seconds
    const span = 1 - pa.at;
    // Panel-local time: the panel's own entrance is at 0, everything else follows it.
    const clock: Clock = { P: (at) => (Math.max(0, at - pa.at) / span) * dur, D: (d) => (d / span) * dur, end: dur };
    const tl = gsap.timeline({ paused: true, defaults: { ease: 'none' } });
    buildPanel(tl, sheet, cell, pg, pa, pi, clock, restore);
    ScrollTrigger.create({ trigger: cell, start: 'top 85%', once: true, onEnter: () => tl.play() });
  });
}

const INV: [string, string][] = [['terminal', 'Термінал'], ['git', 'Git'], ['react', 'React'], ['ts', 'TypeScript'], ['node', 'Node.js'], ['mongo', 'MongoDB'], ['db', 'Бази даних']];
const GLYPHS = ['{ }', 'null', '</>', 'undefined', '✦', '▲', '[ ]', '404', '=>', ';', '✦', '0x1F', '∞', '?'];

/**
 * The cover swings open on its left edge, the book slides to centre, the first page fills in.
 * `spread`: room for two pages side by side (desktop). On a phone there is room for one page only, so the book stays
 * where it is and the cover swings off to the left instead of pushing the page out of the screen.
 */
function buildBook(tl: gsap.core.Timeline, el: HTMLElement, L: number, spread: boolean) {
  const q = gsap.utils.selector(el);
  if (spread) {
    tl.fromTo(q('.js-hint'), { opacity: 1 }, { opacity: 0, duration: L * 0.05 }, 0);
    tl.fromTo(q('.js-box'), { xPercent: 0 }, { xPercent: 50, duration: L * 0.35, ease: 'power2.inOut' }, L * 0.05);
  }
  tl.fromTo(q('.js-cover'), { rotationY: 0, transformPerspective: 2200 }, { rotationY: -180, duration: L * 0.35, ease: 'power2.inOut' }, L * 0.05);
  tl.call(() => sound.playBookOpen(), [], L * 0.1);
  tl.fromTo(q('.js-shade'), { opacity: 0.6 }, { opacity: 0, duration: L * 0.35 }, L * 0.05);
  tl.fromTo(q('.js-pop'), { opacity: 0, y: 20, scale: 0.94 }, { opacity: 1, y: 0, scale: 1, stagger: L * 0.05, duration: L * 0.08, ease: 'power2.out' }, L * 0.3);
  tl.fromTo(q('.js-inv > *'), { opacity: 0, x: -14 }, { opacity: 1, x: 0, stagger: L * 0.03, duration: L * 0.05, ease: 'power2.out' }, L * 0.36);
}

function BookPage({ onOpenProjects }: { onOpenProjects?: () => void }) {
  return (
    <section className="page page--book js-bookpage" aria-label="Вступ">
      <div className="bookwrap">
        <div className="book js-box">
          <div className="book__page">
            <div className="intro">
              <h1 className="intro__name js-pop">{profile.name}</h1>
              <p className="intro__role js-pop">{profile.role}</p>
              <p className="box js-pop">Кожен розробник має свій шлях. Ось мій, розказаний коміксом: від першого «Привіт, світе» до вершини.</p>
              <ul className="stickers js-pop">
                <li>6 розділів</li>
                <li>1 яма з багами</li>
                <li>1 монстр коду</li>
                {onOpenProjects && (
                  <li>
                    <button
                      type="button"
                      className="sticker--btn"
                      onClick={onOpenProjects}
                      title="Переглянути проекти"
                    >
                      ⭐ Кейси
                    </button>
                  </li>
                )}
              </ul>
              <p className="bubble js-pop">Готовий? Гортай вниз!</p>
            </div>
            <div className="book__shade js-shade" />
          </div>
          <div className="book__cover js-cover">
            <div className="cover__face cover__front"><img src="/assets/cover.webp" alt="Обкладинка коміксу «Шлях розробника»: розробник на вершині з ноутбуком, що світиться" /></div>
            <div className="cover__face cover__back">
              <h3>Інвентар героя</h3>
              <ul className="inv js-inv">{INV.map(([i, l]) => <li key={i}><img src={asset(`icon-${i}.webp`)} alt="" />{l}</li>)}</ul>
            </div>
          </div>
        </div>
        <p className="hint js-hint" aria-hidden="true">Гортай вниз ↓</p>
      </div>
    </section>
  );
}

export function Comic({ pages }: { pages: PageDef[] }) {
  const root = useRef<HTMLDivElement>(null);
  const [activeChapter, setActiveChapter] = useState(0);
  const [isProjectsOpen, setIsProjectsOpen] = useState(false);
  const [copyState, setCopyState] = useState<'idle' | 'ok' | 'fail'>('idle');
  const [staticMode, setStaticMode] = useState(false);
  const [atEnd, setAtEnd] = useState(false); // the last page is on screen: the floating "Контакти" button would only cover its buttons
  const staticRef = useRef(false);
  useEffect(() => { staticRef.current = staticMode; }, [staticMode]);
  const closeProjects = useCallback(() => setIsProjectsOpen(false), []);
  const chapterRef = useRef(0);
  const modalOpenRef = useRef(false);
  useEffect(() => { chapterRef.current = activeChapter; }, [activeChapter]);
  useEffect(() => { modalOpenRef.current = isProjectsOpen; }, [isProjectsOpen]);
  useEffect(() => {
    const last = root.current?.querySelector('.page:last-of-type');
    if (!last) return;
    const io = new IntersectionObserver(([e]) => setAtEnd(e.isIntersecting), { threshold: 0.3 });
    io.observe(last);
    return () => io.disconnect();
  }, []);

  // One schedule for the timeline, the dots and the navigation. Rebuilt whenever story.json changes.
  const sch = useMemo(() => schedule(pages), [pages]);
  const total = sch.total;
  const schRef = useRef(sch);
  schRef.current = sch;
  const stRef = useRef<ScrollTrigger | null>(null); // the pinned master ScrollTrigger (desktop only)
  const navTarget = useRef<number | null>(null); // chapter we are currently travelling to

  const handleCopyEmail = async () => {
    let ok = false;
    try {
      await navigator.clipboard.writeText(profile.email);
      ok = true;
    } catch {
      // Clipboard API is unavailable on non-HTTPS pages or when permission is denied: try the old way.
      try {
        const ta = document.createElement('textarea');
        ta.value = profile.email;
        ta.setAttribute('readonly', '');
        ta.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        ta.remove();
      } catch {
        ok = false;
      }
    }
    setCopyState(ok ? 'ok' : 'fail');
    if (ok) sound.playPop();
    setTimeout(() => setCopyState('idle'), 2400);
  };

  const toggleStatic = () => {
    sound.playPop();
    setActiveChapter(0);
    chapterRef.current = 0;
    setStaticMode((v) => !v);
    window.scrollTo(0, 0);
  };

  // Jump to a chapter. The target comes from the same schedule as the timeline, and the pixel position from the
  // ScrollTrigger itself (start/end), so it stays exact even if the page length or the story changes.
  const handleSelectChapter = useCallback((index: number) => {
    const st = stRef.current;
    if (!st) return; // phones / static mode: plain document scroll, nothing to jump to
    const s = schRef.current;
    const clamped = Math.max(0, Math.min(s.starts.length, index));
    const y = st.start + (chapterTime(s, clamped) / s.total) * (st.end - st.start);
    navTarget.current = clamped;
    setActiveChapter(clamped);
    chapterRef.current = clamped;
    const done = () => { navTarget.current = null; };
    if (lenis) lenis.scrollTo(y, { duration: 1.4, lock: true, onComplete: done });
    else { window.scrollTo({ top: y, behavior: 'smooth' }); setTimeout(done, 1500); }
  }, []);

  useEffect(() => {
    // Only events that browsers count as a user gesture (wheel / touchstart / mousemove do not), otherwise the
    // AudioContext is created too early and the console fills with "AudioContext was not allowed to start".
    const unlock = () => sound.unlock();
    const events = ['pointerdown', 'pointerup', 'click', 'keydown', 'touchend'] as const;
    events.forEach((ev) => window.addEventListener(ev, unlock, { passive: true }));
    return () => events.forEach((ev) => window.removeEventListener(ev, unlock));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (modalOpenRef.current) return; // the modal owns the keyboard while it is open
      // Chapter jumping only makes sense in the pinned desktop mode; elsewhere the browser scrolls natively.
      if (staticRef.current || !window.matchMedia(`${DESK_MQ} and ${MOTION_MQ}`).matches) {
        if (e.key.toLowerCase() === 'm') sound.toggleMute();
        return;
      }
      const el = e.target as HTMLElement | null;
      if (el?.closest('input, textarea, select')) return;
      const key = e.key;
      // Space/Enter must keep activating focused buttons and links.
      if ((key === ' ' || key === 'Enter') && el?.closest('button, a, [role="button"]')) return;
      const last = pages.length;
      const now = navTarget.current ?? chapterRef.current; // while travelling, count from the destination
      const go = (next: number) => {
        e.preventDefault();
        handleSelectChapter(next);
      };
      if (key === 'ArrowDown' || key === 'PageDown' || (key === ' ' && !e.shiftKey)) {
        go(Math.min(last, now + 1));
      } else if (key === 'ArrowUp' || key === 'PageUp' || (key === ' ' && e.shiftKey)) {
        go(Math.max(0, now - 1));
      } else if (key.toLowerCase() === 'm') {
        sound.toggleMute();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pages.length, handleSelectChapter]);

  useGSAP(() => {
    const q = gsap.utils.selector(root);
    const mm = gsap.matchMedia();
    mm.add({ desk: DESK_MQ, ok: MOTION_MQ, hover: '(hover: hover)' }, (ctx) => {
      const { desk, ok, hover } = (ctx.conditions ?? {}) as Record<string, boolean>;
      if (!ok || staticMode) {
        // Static comic (reduced motion or the skip button): every panel in its final state, climb art placed by hand.
        const sheetsEl = q('.js-sheet') as HTMLElement[];
        const layoutClimb = () => pages.forEach((pg, k) => {
          if (!pg.marks) return;
          const layer = sheetsEl[k]?.querySelector('.js-hero')?.parentElement;
          if (!layer) return;
          placeClimb(layer, pg.marks, 1);
          gsap.set(layer.querySelectorAll('.js-mark'), { opacity: 1, scale: 1 });
        });
        layoutClimb();
        window.addEventListener('resize', layoutClimb);
        return () => window.removeEventListener('resize', layoutClimb);
      }
      const restore: (() => void)[] = [];
      const sheets = q('.js-sheet') as HTMLElement[];
      const bookEl = q('.js-bookpage')[0] as HTMLElement;

      // Desktop: ONE pinned stage and one master timeline. The book opens, dives into page 1, and pages push each other up.
      // Phones / small windows: no pin; each panel plays once by itself when it scrolls into view (buildStack).
      const master = desk
        ? gsap.timeline({
            defaults: { ease: 'none' },
            scrollTrigger: {
              trigger: root.current,
              start: 'top top',
              end: `+=${total}%`,
              pin: true,
              scrub: 1,
              anticipatePin: 1,
              onUpdate: (self) => {
                // While a jump is in flight the dot already shows the destination instead of flickering through every chapter.
                setActiveChapter(navTarget.current ?? chapterAt(sch, self.progress * total));
              },
            },
          })
        : null;

      stRef.current = master?.scrollTrigger ?? null;
      if (master) {
        // Initially hide page 0 and position all later sheets offscreen at +120%
        master.set(sheets[0], { opacity: 0, scale: 0.95 }, 0);
        sheets.slice(1).forEach((sh) => {
          master.set(sh, { yPercent: 120, opacity: 0.2 }, 0);
        });

        buildBook(master, bookEl, B, true);
        master.to(bookEl, { scale: 1.8, opacity: 0, duration: T, ease: 'power2.inOut' }, B - T);
      } else {
        // The book is on screen from the very first frame, so it opens by itself (after a beat) instead of being scrubbed.
        const bt = gsap.timeline({ paused: true, delay: 0.4, defaults: { ease: 'none' } });
        buildBook(bt, bookEl, 2.4, false);
        ScrollTrigger.create({ trigger: bookEl, start: 'top 90%', once: true, onEnter: () => bt.play() });
      }

      pages.forEach((pg, k) => {
        const sheet = sheets[k];
        if (!master) {
          buildStack(sheet, pg, restore);
          return;
        }
        const s = sch.starts[k];
        buildPage(master, sheet, pg, s, pg.scroll, 0.82, restore);

        if (k === 0) {
          master.to(sheet, { opacity: 1, scale: 1, duration: T, ease: 'power2.out' }, s);
        } else {
          master.to(sheet, { yPercent: 0, opacity: 1, duration: T, ease: 'power2.inOut' }, s);
          master.call(() => sound.playPageTurn(), [], s);
        }

        if (k < pages.length - 1) {
          master.to(sheet, { yPercent: -120, opacity: 0.2, duration: T, ease: 'power2.inOut' }, s + pg.scroll - T);
        }
      });
      let off = () => {};
      if (master) {
        master.fromTo(q('.js-dots'), { backgroundPosition: '0px 0px' }, { backgroundPosition: '0px -900px', duration: total }, 0);
        master.fromTo(q('.js-progress'), { scaleX: 0 }, { scaleX: 1, duration: total }, 0);
        (q('.js-glyph') as HTMLElement[]).forEach((g, i) => master.to(g, { y: `-${g.dataset.sp}vh`, rotate: i % 2 ? 40 : -40, duration: total }, 0));
        master.to({}, { duration: 0 }, total);
        if (hover) {
          // Depth: pages tilt a few degrees toward the pointer and the drifting symbols move the other way.
          const tilt = q('.page') as HTMLElement[];
          gsap.set(tilt, { transformPerspective: 1400 });
          const rx = tilt.map((p) => gsap.quickTo(p, 'rotationX', { duration: 0.9, ease: 'power3' }));
          const ry = tilt.map((p) => gsap.quickTo(p, 'rotationY', { duration: 0.9, ease: 'power3' }));
          const drift = q('.js-drift')[0];
          const mx = gsap.quickTo(drift, 'x', { duration: 1.2, ease: 'power3' });
          const my = gsap.quickTo(drift, 'y', { duration: 1.2, ease: 'power3' });
          const move = (e: PointerEvent) => {
            const nx = e.clientX / window.innerWidth - 0.5, ny = e.clientY / window.innerHeight - 0.5;
            rx.forEach((f) => f(-ny * 5)); ry.forEach((f) => f(nx * 7)); mx(-nx * 50); my(-ny * 50);
          };
          window.addEventListener('pointermove', move);
          off = () => window.removeEventListener('pointermove', move);
        }
      }
      return () => { restore.forEach((f) => f()); off(); stRef.current = null; navTarget.current = null; };
    });
    return () => mm.revert();
  }, { scope: root, dependencies: [staticMode, pages, sch], revertOnUpdate: true }); // `pages`: rebuild when story.json is edited (HMR)

  return (
    <div ref={root} className={`stage${staticMode ? ' stage--static' : ''}`}>
      <button type="button" className="skip-anim" onClick={toggleStatic}>
        {staticMode ? '▶ Повернути анімацію' : '⏭ Пропустити анімацію'}
      </button>
      <CursorTrail />
      <div className="stage__dots js-dots" aria-hidden="true" />
      <div className="drift js-drift" aria-hidden="true">
        {GLYPHS.map((g, i) => (
          <span key={i} className="glyph js-glyph" data-sp={90 + ((i * 47) % 130)} style={{ left: `${(i * 37 + 11) % 92}%`, top: `${(i * 83) % 200}vh`, fontSize: `${1.1 + ((i * 7) % 5) * 0.5}rem`, rotate: `${((i * 29) % 50) - 25}deg` }}>{g}</span>
        ))}
      </div>
      <div className="progress js-progress" aria-hidden="true" />
      <SoundToggle />
      <button type="button" className={`jump-end${atEnd ? ' jump-end--hidden' : ''}`} tabIndex={atEnd ? -1 : 0} aria-hidden={atEnd || undefined} onClick={() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'smooth' })}>
        ✉ Контакти
      </button>
      <ChapterNav pages={pages} activeChapter={activeChapter} onSelectChapter={handleSelectChapter} />
      <BookPage onOpenProjects={() => setIsProjectsOpen(true)} />
      {pages.map((pg) => (
        <section key={pg.id} className="page" aria-label={(pg.panels.flatMap((p) => p.items).find((i) => i.k === 'title') as Extract<Item, { k: 'title' }> | undefined)?.t}>
          <div className="sheet js-sheet" style={{ '--cols': pg.cols, '--rows': pg.rows, '--areas': pg.d } as CSSProperties}>
            {pg.panels.map((p, pi) => {
              const inner = p.items.filter((i) => !i.over);
              const over = p.items.filter((i) => i.over);
              const layer = (it: Item, ii: number) => (
                <div key={ii} className="layer js-layer" style={{ transformOrigin: origin(it) }}>
                  <ItemView
                    it={it}
                    marks={pg.marks}
                    onOpenProjects={() => setIsProjectsOpen(true)}
                    copyState={copyState}
                    onCopyEmail={handleCopyEmail}
                  />
                </div>
              );
              return (
                <div key={pi} className={`cell js-cell${p.jag ? ' cell--jag' : ''}${over.length ? ' cell--over' : ''}`} style={{ '--a': p.a, '--ma': stackRatio(pg, p) } as CSSProperties}>
                  <div className={`cell__in cell__in--${p.tone ?? 'art'}${p.tint ? ` cell__in--${p.tint}` : ''}`}>
                    {p.bg && p.f && <img className="bg js-bg" src={asset(p.bg)} alt="" style={{ objectPosition: `${p.f[0]}% ${p.f[1]}%`, transformOrigin: `${p.f[0]}% ${p.f[1]}%` }} />}
                    {p.fx && <div className={`fx fx-${p.fx}`} aria-hidden="true" />}
                    {inner.map(layer)}
                    <div className="flash js-flash" aria-hidden="true" />
                    {p.sh !== undefined && <div className="speed js-speed" aria-hidden="true" />}
                  </div>
                  {over.map(layer)}
                </div>
              );
            })}
          </div>
        </section>
      ))}
      <div className="grain" aria-hidden="true" />
      <div className="vignette" aria-hidden="true" />

      <ProjectsModal isOpen={isProjectsOpen} onClose={closeProjects} />
    </div>
  );
}

