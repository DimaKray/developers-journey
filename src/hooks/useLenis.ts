import { useEffect } from 'react';
import Lenis from 'lenis';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

/** The live Lenis instance (null with reduced motion). Programmatic jumps must go through it, not window.scrollTo. */
export let lenis: Lenis | null = null;

// Smooth scroll wired into GSAP's ticker so ScrollTrigger and Lenis share one clock.
// `enabled = false` freezes scrolling (the loading screen is on top).
export function useLenis(enabled = true) {
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const instance = new Lenis({ lerp: 0.1 });
    lenis = instance;
    instance.on('scroll', ScrollTrigger.update);
    const tick = (t: number) => instance.raf(t * 1000);
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => { gsap.ticker.remove(tick); instance.destroy(); if (lenis === instance) lenis = null; };
  }, []);

  useEffect(() => {
    if (!lenis) return;
    if (enabled) lenis.start(); else lenis.stop();
  }, [enabled]);
}
