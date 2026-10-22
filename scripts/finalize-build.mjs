import { writeFile } from 'node:fs/promises';
const site=(process.env.SITE_URL||'https://ladse-pages.pages.dev').replace(/\/$/,'');
await writeFile(new URL('../dist/robots.txt',import.meta.url),`User-agent: *\nAllow: /\nDisallow: /archive/\nSitemap: ${site}/sitemap-index.xml\n`);
