import { defineConfig } from 'vitest/config'
import { resolve } from 'node:path'

// Test-only config. Kept separate from vite.config.ts so the app build (tsc -b +
// vite build, vite@6) never has to type the vitest `test` block. vitest loads this
// file in preference to vite.config.ts. No plugins here → no vite@5/@6 type skew;
// the unit/component tests don't import .mdx digests or use the @/ alias.
//
// css.postcss: empty config prevents vitest's embedded vite@5 from walking up to
// the monorepo root's postcss.config.js (which requires @tailwindcss/postcss, not
// installed in this sub-package).
export default defineConfig({
  root: resolve(__dirname, '.'),
  css: {
    postcss: {},
  },
  test: {
    environment: 'jsdom',
    // matchMedia polyfill — GSAP's ScrollTrigger needs it at module-eval time. See test-setup.ts.
    setupFiles: ['./src/test-setup.ts'],
  },
})
