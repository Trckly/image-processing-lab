/* 4 → N → 3 perceptron, softmax output, cross-entropy loss, plain SGD. */
import { mulberry32, gaussFrom } from "../core/random.js";

export const norm = v => (v - 100) / 40;

export const ACT = {
  sigmoid: { f: z => 1 / (1 + Math.exp(-z)), d: (z, h) => h * (1 - h) },
  tanh:    { f: z => Math.tanh(z),           d: (z, h) => 1 - h * h },
  relu:    { f: z => z > 0 ? z : 0,          d: (z) => z > 0 ? 1 : 0 },
};

export class MLP {
  constructor(nIn, nH, nOut, act, seed) {
    const rng = mulberry32(seed), g = gaussFrom(rng);
    this.nIn = nIn; this.nH = nH; this.nOut = nOut; this.act = act;
    const s1 = Math.sqrt(2 / (nIn + nH)), s2 = Math.sqrt(2 / (nH + nOut));
    this.W1 = Array.from({ length: nH }, () => Array.from({ length: nIn }, () => g() * s1));
    this.b1 = new Array(nH).fill(0);
    this.W2 = Array.from({ length: nOut }, () => Array.from({ length: nH }, () => g() * s2));
    this.b2 = new Array(nOut).fill(0);
  }

  forward(xr) {
    const x = xr.map(norm), A = ACT[this.act];
    const z1 = this.W1.map((w, j) => w.reduce((s, wi, i) => s + wi * x[i], this.b1[j]));
    const h = z1.map(A.f);
    const z2 = this.W2.map((w, k) => w.reduce((s, wj, j) => s + wj * h[j], this.b2[k]));
    const m = Math.max(...z2), e = z2.map(z => Math.exp(z - m)), se = e.reduce((a, b) => a + b, 0);
    return { x, z1, h, p: e.map(v => v / se) };
  }

  step(xr, y, lr) {
    const { x, z1, h, p } = this.forward(xr), A = ACT[this.act];
    const dz2 = p.map((pk, k) => pk - (k === y ? 1 : 0));
    const dh = h.map((_, j) => dz2.reduce((s, d, k) => s + d * this.W2[k][j], 0));
    const dz1 = dh.map((d, j) => d * A.d(z1[j], h[j]));
    for (let k = 0; k < this.nOut; k++) { for (let j = 0; j < this.nH; j++) this.W2[k][j] -= lr * dz2[k] * h[j]; this.b2[k] -= lr * dz2[k]; }
    for (let j = 0; j < this.nH; j++) { for (let i = 0; i < this.nIn; i++) this.W1[j][i] -= lr * dz1[j] * x[i]; this.b1[j] -= lr * dz1[j]; }
    return -Math.log(Math.max(p[y], 1e-12));
  }

  predict(xr) { const p = this.forward(xr).p; return { p, k: p.indexOf(Math.max(...p)) }; }
}
