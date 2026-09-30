import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { sound } from '../sound';
import { preloadAssets } from '../preload';

/**
 * Loading screen. Scroll is locked while it is on. When everything is loaded it asks for one click: that click is a real
 * user gesture, so the sound can start without browser warnings.
 */
export function Loader({ onDone }: { onDone: () => void }) {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const startBtn = useRef<HTMLButtonElement>(null);
  const startMuted = useRef(sound.isMuted());

  useEffect(() => {
    const html = document.documentElement;
    html.classList.add('is-loading');
    let alive = true;
    const t0 = performance.now();
    preloadAssets((p) => { if (alive) setProgress(p); }).then(() => {
      // Do not flash the screen for a split second when everything is already cached.
      const wait = Math.max(0, 600 - (performance.now() - t0));
      window.setTimeout(() => { if (alive) setReady(true); }, wait);
    });
    return () => { alive = false; html.classList.remove('is-loading'); };
  }, []);

  useEffect(() => { if (ready) startBtn.current?.focus(); }, [ready]);

  const start = (withSound: boolean) => {
    if (leaving) return;
    sound.unlock(); // this click is a user gesture
    if (!withSound && !sound.isMuted()) sound.toggleMute();
    else sound.playPop();
    setLeaving(true);
    window.setTimeout(onDone, 450);
  };

  const pct = Math.round(progress * 100);
  return (
    <div className={`loader${leaving ? ' loader--leaving' : ''}`} role="dialog" aria-modal="true" aria-label="Завантаження" aria-busy={!ready}>
      <div className="loader__card">
        <h1 className="loader__head">Шлях розробника</h1>
        <div className="loader__body">
          <p className="loader__status" role="status">{ready ? 'Все готово. Можна починати!' : `Малюю комікс… ${pct}%`}</p>
          <div className="loader__track" style={{ '--p': pct } as CSSProperties} aria-hidden="true">
            <div className="loader__fill" />
            <img className="loader__hero" src="/assets/hero-climb.webp" alt="" />
          </div>
          <div className="loader__actions" style={{ visibility: ready ? 'visible' : 'hidden' }}>
            <button ref={startBtn} type="button" className="loader__btn" onClick={() => start(true)} tabIndex={ready ? 0 : -1}>
              ▶ {startMuted.current ? 'Почати' : 'Почати зі звуком'}
            </button>
            {!startMuted.current && (
              <button type="button" className="loader__ghost" onClick={() => start(false)} tabIndex={ready ? 0 : -1}>Без звуку</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
