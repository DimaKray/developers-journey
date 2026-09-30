import { useState } from 'react';
import type { PageDef } from '../types';
import { sound } from '../sound';

interface ChapterNavProps {
  pages: PageDef[];
  activeChapter: number;
  onSelectChapter: (index: number) => void;
}

const ICONS = ['📖', '💻', '⚠️', '⚔️', '🪜', '👾', '🏔️'];
const titleOf = (p: PageDef) => (p.panels.flatMap((x) => x.items).find((i) => i.k === 'title') as { t: string } | undefined)?.t;

export function ChapterNav({ pages, activeChapter, onSelectChapter }: ChapterNavProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const CHAPTER_NAMES = [
    { n: '0', title: 'Вступ', icon: ICONS[0] },
    ...pages.map((p, i) => ({ n: String(i + 1), title: titleOf(p) ?? `Розділ ${i + 1}`, icon: ICONS[i + 1] ?? '✦' })),
  ];

  return (
    <nav className="chapter-nav" aria-label="Навігація по розділах">
      <div className="chapter-nav__track">
        {CHAPTER_NAMES.map((ch, idx) => {
          const isActive = activeChapter === idx;
          const isHovered = hovered === idx;
          return (
            <button
              key={ch.n}
              type="button"
              className={`chapter-nav__dot ${isActive ? 'chapter-nav__dot--active' : ''}`}
              onClick={() => {
                sound.playPop();
                onSelectChapter(idx);
              }}
              onMouseEnter={() => {
                setHovered(idx);
              }}
              onMouseLeave={() => setHovered(null)}
              aria-label={`Перейти до розділу ${ch.n}: ${ch.title}`}
              aria-current={isActive ? 'step' : undefined}
            >
              <span className="chapter-nav__num">{ch.n === '0' ? '✦' : ch.n}</span>
              {(isHovered || isActive) && (
                <span className="chapter-nav__tooltip" role="tooltip">
                  <span className="chapter-nav__icon">{ch.icon}</span>
                  <span className="chapter-nav__text">{ch.title}</span>
                </span>
              )}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
