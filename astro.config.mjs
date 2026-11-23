import { defineConfig } from 'astro/config';

// Where the site lives:
// - GitHub Pages sets SITE_URL and BASE_PATH in .github/workflows/deploy.yml
// - Netlify sets URL automatically
// - When you connect your own domain, set SITE_URL to it and BASE_PATH to "/" in the workflow.
export default defineConfig({
  site: process.env.SITE_URL || process.env.URL || 'http://localhost:4321',
  base: process.env.BASE_PATH || '/',
  build: { inlineStylesheets: 'always' },
});
