import { useEffect, useState } from 'react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { Comic } from './components/Comic';
import { Loader } from './components/Loader';
import { SwordCursor } from './components/SwordCursor';
import { pages } from './story';
import { useLenis } from './hooks/useLenis';

export default function App() {
  const [ready, setReady] = useState(false); // the loading screen is gone
  useLenis(ready); // scrolling is frozen while the loading screen is on
  // Pictures and fonts are in: measure the pinned stage once more.
  useEffect(() => {
    if (ready) requestAnimationFrame(() => ScrollTrigger.refresh());
  }, [ready]);
  return (
    <main>
      <Comic pages={pages} />
      {!ready && <Loader onDone={() => setReady(true)} />}
      <SwordCursor />
    </main>
  );
}
