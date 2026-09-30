import { useEffect, useRef } from 'react';
import { profile } from '../config';
import { sound } from '../sound';

interface ProjectsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const FOCUSABLE = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function ProjectsModal({ isOpen, onClose }: ProjectsModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    sound.playPop();

    const opener = document.activeElement as HTMLElement | null;
    const html = document.documentElement;
    const prevOverflow = html.style.overflow;
    html.style.overflow = 'hidden'; // no page scroll behind the modal
    cardRef.current?.querySelector<HTMLElement>('.modal-close')?.focus();

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      if (e.key !== 'Tab' || !cardRef.current) return;
      const items = Array.from(cardRef.current.querySelectorAll<HTMLElement>(FOCUSABLE));
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];
      const active = document.activeElement;
      if (e.shiftKey && (active === first || !cardRef.current.contains(active))) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && (active === last || !cardRef.current.contains(active))) {
        e.preventDefault();
        first.focus();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('keydown', handleKey);
      html.style.overflow = prevOverflow;
      opener?.focus?.();
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" data-lenis-prevent onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div ref={cardRef} className="modal-card js-modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div className="modal-badge">⭐ КЕЙСИ</div>
          <h2 id="modal-title" className="modal-title">Мої проекти та розробки</h2>
          <button
            type="button"
            className="modal-close"
            onClick={() => {
              sound.playPop();
              onClose();
            }}
            aria-label="Закрити"
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div className="projects-grid">
            {profile.projects.map((proj) => (
              <article key={proj.id} className="project-card">
                <div className="project-card__head">
                  <span className="project-card__icon" aria-hidden="true">{proj.icon ?? '🚀'}</span>
                  <h3 className="project-card__title">{proj.title}</h3>
                </div>
                <p className="project-card__desc">{proj.desc}</p>
                <div className="project-card__tech">
                  {proj.tech.map((t) => (
                    <span key={t} className="tech-badge">{t}</span>
                  ))}
                </div>
                <div className="project-card__actions">
                  {proj.link && (
                    <a
                      href={proj.link}
                      target="_blank"
                      rel="noreferrer"
                      className="project-btn project-btn--demo"
                    >
                      <span>⚡ Демо</span>
                    </a>
                  )}
                  {proj.github && (
                    <a
                      href={proj.github}
                      target="_blank"
                      rel="noreferrer"
                      className="project-btn project-btn--code"
                    >
                      <span>💻 GitHub</span>
                    </a>
                  )}
                </div>
              </article>
            ))}
          </div>
        </div>

        <div className="modal-footer">
          <p className="modal-footer__hint">Маєш ідею для спільного проекту?</p>
          <a
            href={`mailto:${profile.email}`}
            className="modal-footer__btn"
          >
            ✉ Обговорити співпрацю
          </a>
        </div>
      </div>
    </div>
  );
}
