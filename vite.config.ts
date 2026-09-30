import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// The public address is used for og:image, og:url and canonical (they must be absolute).
// On Vercel it is picked up automatically from VERCEL_PROJECT_PRODUCTION_URL;
// for a custom domain set SITE_URL (e.g. https://krainov.dev) in the project's Environment Variables.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  const vercelHost = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const site = (env.SITE_URL || process.env.SITE_URL || (vercelHost ? `https://${vercelHost}` : '')).replace(/\/$/, '');
  return {
    plugins: [
      react(),
      { name: 'site-url', transformIndexHtml: { order: 'pre', handler: (html: string) => html.split('__SITE_URL__').join(site) } },
    ],
  };
});
