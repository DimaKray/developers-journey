import { useEffect, useRef } from 'react';

const ICONS = ['✦', '★', '{ }', '▲', '</>'];

interface Particle {
  x: number;
  y: number;
  text: string;
  size: number;
  opacity: number;
  vy: number;
  vx: number;
  rotation: number;
  vr: number;
}

export function CursorTrail() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    if (!window.matchMedia('(hover: hover)').matches) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animId: number;
    let particles: Particle[] = [];
    let lastX = 0;
    let lastY = 0;
    let lastTime = 0;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const resize = () => {
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    const handlePointerMove = (e: PointerEvent) => {
      const now = performance.now();
      const dist = Math.hypot(e.clientX - lastX, e.clientY - lastY);
      if (dist > 18 && now - lastTime > 40) {
        lastX = e.clientX;
        lastY = e.clientY;
        lastTime = now;
        particles.push({
          x: e.clientX,
          y: e.clientY,
          text: ICONS[Math.floor(Math.random() * ICONS.length)],
          size: 11 + Math.random() * 8,
          opacity: 0.65,
          vy: -0.4 - Math.random() * 0.6,
          vx: (Math.random() - 0.5) * 0.8,
          rotation: (Math.random() - 0.5) * 0.4,
          vr: (Math.random() - 0.5) * 0.05,
        });
        if (particles.length > 25) {
          particles.shift();
        }
      }
    };
    window.addEventListener('pointermove', handlePointerMove, { passive: true });

    const render = () => {
      ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        p.rotation += p.vr;
        p.opacity -= 0.016;

        if (p.opacity <= 0) {
          particles.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.fillStyle = `rgba(242, 138, 75, ${p.opacity})`;
        ctx.font = `bold ${p.size}px monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.text, 0, 0);
        ctx.restore();
      }
      animId = requestAnimationFrame(render);
    };
    animId = requestAnimationFrame(render);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', handlePointerMove);
      cancelAnimationFrame(animId);
    };
  }, []);

  return <canvas ref={canvasRef} className="cursor-trail" aria-hidden="true" />;
}
