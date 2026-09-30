import { useEffect, useRef } from 'react';
import gsap from 'gsap';

const WORDS = ['БАМ!', 'ТУК!', 'ЧІК!', 'ДЗІНЬ!'];
const HOT = 'a[href], button, [role="button"], summary, .legend li';

/**
 * The hero's glowing sword instead of the arrow. The tip is the pointer. It leans in the direction of movement,
 * glows over buttons and links, and swings on click with sparks and a comic sound word.
 * Only for a real mouse (hover + fine pointer) and without reduced motion; otherwise the normal cursor stays.
 */
export function SwordCursor() {
  const root = useRef<HTMLDivElement>(null);
  const tilt = useRef<HTMLDivElement>(null);
  const swing = useRef<HTMLDivElement>(null);
  const fx = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const el = root.current, rot = tilt.current, sw = swing.current, layer = fx.current;
    if (!el || !rot || !sw || !layer) return;
    const html = document.documentElement;

    const moveX = gsap.quickTo(el, 'x', { duration: 0.09, ease: 'power3' });
    const moveY = gsap.quickTo(el, 'y', { duration: 0.09, ease: 'power3' });
    const leanTo = gsap.quickTo(rot, 'rotation', { duration: 0.35, ease: 'power3' });
    let seen = false, lastX = 0, idle = 0;

    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      if (!seen) {
        seen = true;
        // The normal cursor is hidden only once we are sure the sword is following the mouse.
        html.classList.add('has-sword-cursor');
        gsap.set(el, { x: e.clientX, y: e.clientY });
        gsap.to(el, { opacity: 1, duration: 0.2 });
      }
      moveX(e.clientX);
      moveY(e.clientY);
      leanTo(gsap.utils.clamp(-28, 28, (e.clientX - lastX) * 1.2));
      lastX = e.clientX;
      window.clearTimeout(idle);
      idle = window.setTimeout(() => leanTo(0), 90);
      el.classList.toggle('is-hot', !!(e.target as Element | null)?.closest?.(HOT));
    };

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      gsap.killTweensOf(sw);
      gsap.timeline()
        .to(sw, { rotation: -35, duration: 0.07, ease: 'power2.out' })
        .to(sw, { rotation: 14, scale: 1.1, duration: 0.09, ease: 'power2.in' })
        .to(sw, { rotation: 0, scale: 1, duration: 0.3, ease: 'elastic.out(1, 0.5)' });

      for (let i = 0; i < 7; i++) {
        const s = document.createElement('span');
        s.className = 'sword-fx__spark';
        s.textContent = i % 2 ? '✦' : '★';
        layer.appendChild(s);
        const a = (Math.PI * 2 * i) / 7 + Math.random() * 0.6;
        const r = 26 + Math.random() * 34;
        gsap.fromTo(s, { x: e.clientX, y: e.clientY, scale: 0.4, opacity: 1 }, {
          x: e.clientX + Math.cos(a) * r, y: e.clientY + Math.sin(a) * r, scale: 1, opacity: 0, rotation: (Math.random() - 0.5) * 120,
          duration: 0.5 + Math.random() * 0.2, ease: 'power2.out', onComplete: () => s.remove(),
        });
      }
      const w = document.createElement('span');
      w.className = 'sword-fx__word';
      w.textContent = WORDS[Math.floor(Math.random() * WORDS.length)];
      layer.appendChild(w);
      gsap.timeline({ onComplete: () => w.remove() })
        .fromTo(w, { x: e.clientX + 14, y: e.clientY - 10, scale: 0.4, opacity: 0, rotation: -8 }, { y: e.clientY - 34, scale: 1, opacity: 1, duration: 0.18, ease: 'back.out(2)' })
        .to(w, { y: e.clientY - 52, opacity: 0, duration: 0.4, ease: 'power1.in' }, '+=0.12');
    };

    const onLeave = () => { if (seen) gsap.to(el, { opacity: 0, duration: 0.15 }); };
    const onEnter = () => { if (seen) gsap.to(el, { opacity: 1, duration: 0.15 }); };

    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onDown, { passive: true });
    html.addEventListener('mouseleave', onLeave);
    html.addEventListener('mouseenter', onEnter);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onDown);
      html.removeEventListener('mouseleave', onLeave);
      html.removeEventListener('mouseenter', onEnter);
      window.clearTimeout(idle);
      html.classList.remove('has-sword-cursor');
      gsap.killTweensOf([el, rot, sw]);
      layer.replaceChildren();
    };
  }, []);

  return (
    <>
      <div ref={root} className="sword-cursor" aria-hidden="true" style={{ opacity: 0 }}>
        <div ref={tilt} className="sword-cursor__tilt">
          <div ref={swing} className="sword-cursor__swing">
            <img src="/assets/sword.webp" alt="" />
          </div>
        </div>
      </div>
      <div ref={fx} className="sword-fx" aria-hidden="true" />
    </>
  );
}
