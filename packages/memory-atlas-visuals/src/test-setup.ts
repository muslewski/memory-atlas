// jsdom has no matchMedia. GSAP's ScrollTrigger calls it at *module-eval* time via
// gsap.matchMedia() (the reduced-motion gate the kit relies on), so any test file that
// transitively imports the kit — Counter.test.ts is the one that does — dies on
// `_win.matchMedia is not a function` during collection, before a single test runs.
//
// Minimal non-matching stub: enough for ScrollTrigger.register() to complete. It reports
// "no media query matches", which is exactly what we want in tests — the reduced-motion
// branch stays off and animations are inert under jsdom anyway.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = (query: string): MediaQueryList =>
    ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }) as MediaQueryList
}
