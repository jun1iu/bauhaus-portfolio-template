import { defineConfig } from 'vite';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import { markCurrentPage } from './build/current-page.js';

const root = import.meta.dirname;

// Every .html file in the project root is a page. Add about.html, blog.html…
// and it's built automatically.
const pages = Object.fromEntries(
  readdirSync(root).filter((f) => f.endsWith('.html')).map((f) => [f.replace(/\.html$/, ''), resolve(root, f)]),
);

// Shared HTML: <!-- include: nav.html --> is replaced with partials/nav.html.
function partials() {
  const dir = resolve(root, 'partials');
  return {
    name: 'html-partials',
    transformIndexHtml: {
      order: 'pre',
      handler: (html, ctx) => markCurrentPage(
        html.replace(/<!--\s*include:\s*([\w./-]+)\s*-->/g, (_, file) => readFileSync(resolve(dir, file), 'utf8').trim()),
        ctx.path || '/',
      ),
    },
    handleHotUpdate({ file, server }) {
      if (file.startsWith(dir)) server.ws.send({ type: 'full-reload' });
    },
  };
}

// In development the site and the server run separately; forward the API and photos to the server.
const api = `http://localhost:${process.env.API_PORT || 3001}`;
const proxy = { '/api': api, '/uploads': api };

export default defineConfig({
  // GitHub Pages serves the site from /<repo-name>/. The deploy workflow sets BASE_PATH.
  base: process.env.BASE_PATH || '/',
  plugins: [partials()],
  server: { proxy },
  preview: { proxy },
  build: { rollupOptions: { input: pages } },
  test: { environment: 'node', include: ['tests/**/*.test.js'] },
});
