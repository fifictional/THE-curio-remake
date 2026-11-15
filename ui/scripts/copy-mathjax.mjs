/**
 * Copy MathJax's browser bundle into public/ so typesetting works offline.
 *
 * The CDN is blocked on some networks, and every message then logs
 * "Typesetting failed". The bundle is ~23 MB, so it is gitignored and produced
 * by `npm run mathjax:copy` (wired into postinstall).
 */
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = join(here, '..', 'node_modules', 'mathjax', 'es5');
const target = join(here, '..', 'public', 'mathjax', 'es5');

if (!existsSync(source)) {
  console.warn('[mathjax] package not installed; skipping copy');
  process.exit(0);
}

rmSync(target, { recursive: true, force: true });
cpSync(source, target, { recursive: true });
console.log('[mathjax] copied es5 bundle to public/mathjax/es5');
