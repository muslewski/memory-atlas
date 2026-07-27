/**
 * counter-format.ts — the pure parse/format half of Counter.
 *
 * Split out of Counter.tsx so a test can exercise these without importing the
 * component, which pulls in GSAP: ScrollTrigger registers at module-eval and
 * schedules a setTimeout that outlives the jsdom environment, so the suite died
 * on `requestAnimationFrame is not defined` after teardown.
 */

// Prefix is SYMBOLS only (not letters), so "h264" is rejected (NaN) but "~$0.50" works.
const RE = /^([^\dA-Za-z]*)(-?[\d.,]+)(.*)$/

export function parseCounter(raw: string): { prefix: string; value: number; suffix: string } {
  const m = raw.match(RE)
  if (!m) return { prefix: '', value: NaN, suffix: raw }
  return { prefix: m[1], value: parseFloat(m[2].replace(/,/g, '')), suffix: m[3] }
}

export function decimalsOf(raw: string): number {
  return raw.split('.')[1]?.match(/^\d+/)?.[0].length ?? 0
}

export function formatCounter(
  prefix: string,
  value: number,
  suffix: string,
  decimals: number,
): string {
  return prefix + value.toFixed(decimals) + suffix
}
