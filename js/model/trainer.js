/* Training loop, run a few epochs per animation frame so the UI stays live. Emits "model" on every change. */
import { S, emit, trainRows, testRows } from "../state.js";
import { MLP } from "./mlp.js";
import { mulberry32, shuffle } from "../core/random.js";

export function evaluate(rows) {
  const cm = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  if (!S.net || !rows.length) return { acc: null, loss: null, cm };
  let ok = 0, loss = 0;
  for (const r of rows) {
    const { p, k } = S.net.predict(r.x);
    cm[r.y][k]++; if (k === r.y) ok++;
    loss += -Math.log(Math.max(p[r.y], 1e-12));
  }
  return { acc: ok / rows.length, loss: loss / rows.length, cm };
}

export const isTrained = () => !!(S.net && S.hist.length);

function newNet() {
  S.net = new MLP(4, S.cfg.hidden, 3, S.cfg.act, S.cfg.seed + 7);
  S.hist = []; S.stale = false;
}

let rafId = 0, epochsDone = 0;

export function startTraining() {
  if (!trainRows().length) { emit("model", { error: "Немає прикладів у навчальній вибірці — згенеруйте дані на кроці 1." }); return false; }
  newNet();
  S.training = true; S.targetEpochs = S.cfg.epochs; epochsDone = 0;
  const shuffleRng = mulberry32(S.cfg.seed + 13);
  const perFrame = Math.max(1, Math.ceil(S.targetEpochs / 120));
  const lr = S.cfg.lr;
  const tick = () => {
    if (!S.training) return;
    const rows = trainRows();
    for (let e = 0; e < perFrame && epochsDone < S.targetEpochs; e++) {
      let loss = 0;
      for (const r of shuffle(rows.slice(), shuffleRng)) loss += S.net.step(r.x, r.y, lr);
      epochsDone++;
      S.hist.push({ loss: loss / rows.length, trainAcc: evaluate(rows).acc, testAcc: evaluate(testRows()).acc });
    }
    if (epochsDone >= S.targetEpochs) S.training = false;
    emit("model");
    if (S.training) rafId = requestAnimationFrame(tick);
  };
  emit("model");
  rafId = requestAnimationFrame(tick);
  return true;
}

export function stopTraining() {
  S.training = false;
  cancelAnimationFrame(rafId);
  emit("model");
}

export function resetNet() {
  S.training = false;
  cancelAnimationFrame(rafId);
  S.net = null; S.hist = []; S.stale = false;
  emit("model");
}
