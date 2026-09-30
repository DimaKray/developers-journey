/** Every picture the comic needs. Loaded and decoded before the story starts, so no panel is ever empty. */
export const PRELOAD = [
  'hero-climb.webp', 'cover.webp', 'hero-idle.webp', 'hero-fall.webp', 'hero-shield.webp', 'hero-slash.webp', 'hero-summit.webp',
  'sword.webp', 'monster.webp',
  'bg-desk.webp', 'bg-pit.webp', 'bg-light.webp', 'bg-stairs.webp', 'bg-storm.webp', 'bg-summit.webp',
  'icon-terminal.webp', 'icon-git.webp', 'icon-react.webp', 'icon-ts.webp', 'icon-node.webp', 'icon-mongo.webp', 'icon-db.webp',
];

const load = (src: string) =>
  new Promise<void>((resolve) => {
    const img = new Image();
    img.onload = () => { img.decode().catch(() => {}).then(() => resolve()); };
    img.onerror = () => resolve(); // a missing picture must not block the whole site
    img.src = src;
  });

/** Loads pictures and fonts, reports progress 0..1. Always finishes, even on a slow network (timeout). */
export async function preloadAssets(onProgress: (p: number) => void, timeoutMs = 12000) {
  const tasks: Promise<void>[] = [
    ...PRELOAD.map((f) => load(`/assets/${f}`)),
    document.fonts ? document.fonts.ready.then(() => undefined) : Promise.resolve(),
  ];
  let done = 0;
  const tracked = tasks.map((t) => t.then(() => { done += 1; onProgress(done / tasks.length); }));
  await Promise.race([Promise.all(tracked), new Promise<void>((r) => setTimeout(r, timeoutMs))]);
  onProgress(1);
}
