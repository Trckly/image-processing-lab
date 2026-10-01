export function mulberry32(a) {
  return function () {
    a |= 0; a = a + 0x6D2B79F5 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function gaussFrom(rng) {
  return () => { let u = 0; while (u === 0) u = rng(); const v = rng(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
}

export function shuffle(a, rng) {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

export const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

/** Four BPM readings around a random base inside [lo, hi]. */
export function makeSeq([lo, hi], jitter, rng, g) {
  const base = lo + rng() * (hi - lo);
  return [0, 1, 2, 3].map(() => clamp(Math.round(base + g() * jitter), lo, hi));
}
