import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const site = process.env.SITE_URL || (process.env.CF_PAGES_PROJECT_NAME ? `https://${process.env.CF_PAGES_PROJECT_NAME}.pages.dev` : 'https://ladse-pages.pages.dev');

export default defineConfig({
  site,
  output: 'static',
  trailingSlash: 'always',
  integrations: [sitemap({ filter: (page) => !page.includes('/archive/') })],
  vite: { build: { sourcemap: false } },
});
