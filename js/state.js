/* Shared app state + a tiny event bus. Feature modules never talk to each other directly:
   they mutate S and emit an event; whoever cares re-renders.
   Events: data, ranges, input, model, redraw, route */
import { clamp } from "./core/random.js";

export const CLASSES = [
  { name: "Норма",       short: "N", color: "--c0" },
  { name: "Тахікардія",  short: "T", color: "--c1" },
  { name: "Брадикардія", short: "B", color: "--c2" },
];
export const BPM_MIN = 30, BPM_MAX = 200;

export const S = {
  ranges: [[60, 100], [101, 180], [35, 59]],
  cfg: { perClass: 335, jitter: 4, testShare: 20, seed: 42, hidden: 6, act: "sigmoid", lr: 0.1, epochs: 200 },
  data: [], nextId: 1,
  net: null, hist: [], training: false, targetEpochs: 0, stale: false,
  input: [72, 75, 70, 74],
};

const listeners = new Map();
export function on(evt, fn) {
  if (!listeners.has(evt)) listeners.set(evt, []);
  listeners.get(evt).push(fn);
}
export function emit(evt, detail) { (listeners.get(evt) || []).forEach(fn => fn(detail)); }

export const trainRows = () => S.data.filter(r => r.split === "train");
export const testRows = () => S.data.filter(r => r.split === "test");

/** opts.table — the table must be fully re-rendered (rows added/removed/reordered). */
export function dataChanged(opts = {}) {
  if (S.net && !S.training) S.stale = true;
  emit("data", opts);
}

export function addExample(x, y) {
  S.data.unshift({ id: S.nextId++, x: x.slice(), y, split: "train" });
  dataChanged({ table: true });
  return S.nextId - 1;
}

/** Replace the whole input sequence (presets etc). Single-value edits mutate S.input and emit "input" themselves. */
export function setInput(seq) {
  S.input = seq.map(v => clamp(Math.round(v), BPM_MIN, BPM_MAX));
  emit("input", { external: true });
}

export function expectedByRanges(seq) {
  const mean = seq.reduce((a, b) => a + b, 0) / seq.length;
  const c = S.ranges.findIndex(([lo, hi]) => mean >= lo - .5 && mean <= hi + .5);
  return { mean, c };
}
