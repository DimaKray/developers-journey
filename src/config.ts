export interface ProjectItem {
  id: string;
  title: string;
  desc: string;
  tech: string[];
  link?: string;
  github?: string;
  icon?: string;
}

export const profile = {
  name: 'Дмитро Крайнов',
  role: 'Web-розробник',
  email: 'dima.kray313@gmail.com',
  telegram: 'https://t.me/d_krainov_web',
  resumeUrl: 'https://resume-project-1-chi.vercel.app/',
  links: [
    { label: 'GitHub', href: 'https://github.com/DimaKray' },
    { label: 'Telegram', href: 'https://t.me/d_krainov_web' },
  ],
  projects: [
    {
      id: 'comic-story',
      title: 'The Developer’s Journey',
      desc: 'Інтерактивне скролітелінг-портфоліо у вигляді веб-коміксу з GSAP, Lenis та процедурним звуком на Web Audio API.',
      tech: ['React', 'TypeScript', 'GSAP', 'Lenis', 'Web Audio'],
      github: 'https://github.com/DimaKray/developers-journey.git',
      icon: '⚔️',
    },
    {
      id: 'edujournal',
      title: 'EduJournal',
      desc: 'Електронний журнал успішності для школи (дипломний проєкт): ролі адміністратора, вчителя, учня та батьків з розмежуванням доступу, журнал-матриця оцінок, розклад, домашні завдання та аналітика на графіках.',
      tech: ['React', 'Vite', 'React Router', 'Recharts', 'Node.js', 'Express', 'PostgreSQL', 'JWT'],
      github: 'https://github.com/DimaKray/school--system.git',
      icon: '📓',
    },
    {
      id: 'party-games',
      title: 'Платформа party-ігор',
      desc: 'Fullstack-монорепозиторій із трьома іграми для компанії («Я ніколи не…», «Правда чи дія», «Крокодил»), REST API та адмінкою для керування питаннями.',
      tech: ['TypeScript', 'React', 'Vite', 'Node.js', 'Express', 'Prisma', 'SQLite'],
      link: 'https://tusovka.duckdns.org',
      github: 'https://github.com/DimaKray/party-games-platform.git',
      icon: '🎲',
    },
  ] as ProjectItem[],
};
