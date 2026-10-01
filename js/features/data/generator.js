import { S, CLASSES, BPM_MIN, BPM_MAX, emit, dataChanged } from "../../state.js";
import { mulberry32, gaussFrom, shuffle, clamp, makeSeq } from "../../core/random.js";
import { $, card, slider, bindRange, dot } from "../../core/dom.js";
import { icon } from "../../core/icons.js";

export function generate() {
  const rng = mulberry32(S.cfg.seed), g = gaussFrom(rng);
  const per = S.cfg.perClass, share = S.cfg.testShare / 100;
  const out = [];
  for (let c = 0; c < 3; c++) {
    const arr = [];
    for (let i = 0; i < per; i++) arr.push({ id: 0, x: makeSeq(S.ranges[c], S.cfg.jitter, rng, g), y: c, split: "train" });
    shuffle(arr, rng);
    const nTest = Math.round(per * share);
    for (let i = 0; i < nTest; i++) arr[i].split = "test";
    out.push(...arr);
  }
  shuffle(out, rng);
  S.nextId = 1; out.forEach(r => r.id = S.nextId++);
  S.data = out;
  dataChanged({ table: true });
}

export const generatorCard = () => card({
  icon: "sliders", title: "Генератор", sub: "Синтетичні послідовності ЧСС",
  body: `
    <div class="lbl">Діапазони ЧСС, уд/хв</div>
    <div class="ranges" id="ranges"></div>
    ${slider("perClass", "Прикладів на клас", { min: 5, max: 500, step: 5, value: S.cfg.perClass })}
    ${slider("jitter", "Коливання в послідовності, ± уд/хв", { min: 0, max: 15, step: 1, value: S.cfg.jitter })}
    ${slider("testShare", "Частка тестової вибірки", { min: 0, max: 50, step: 5, value: S.cfg.testShare })}
    <div class="field">
      <label for="seed">Зерно генератора (відтворюваність)</label>
      <div class="row"><input type="number" id="seed" value="${S.cfg.seed}" min="0" max="99999" class="seed-input">
        <button class="btn btn-ghost btn-sm" id="seedRand" type="button">${icon("dice", 15)}Випадкове</button></div>
    </div>
    <div class="btns">
      <button class="btn btn-primary btn-grow" id="genBtn" type="button">${icon("sparkles", 16)}Згенерувати</button>
      <button class="btn" id="clearBtn" type="button">${icon("trash", 16)}Очистити</button>
    </div>`,
});

function renderRanges() {
  $("#ranges").innerHTML = CLASSES.map((k, i) => `${dot(k.color)}<span>${k.name}</span>
    <input type="number" data-r="${i}" data-e="0" min="${BPM_MIN}" max="${BPM_MAX}" value="${S.ranges[i][0]}" aria-label="${k.name}: мінімум">
    <span class="dash">–</span>
    <input type="number" data-r="${i}" data-e="1" min="${BPM_MIN}" max="${BPM_MAX}" value="${S.ranges[i][1]}" aria-label="${k.name}: максимум">`).join("");
}

export function wireGenerator() {
  renderRanges();
  bindRange("perClass", v => v, v => S.cfg.perClass = +v);
  bindRange("jitter", v => "±" + v, v => S.cfg.jitter = +v);
  bindRange("testShare", v => v + "%", v => S.cfg.testShare = +v);

  const seed = $("#seed");
  seed.addEventListener("input", () => S.cfg.seed = parseInt(seed.value, 10) || 0);
  $("#seedRand").addEventListener("click", () => { seed.value = Math.floor(Math.random() * 99999); S.cfg.seed = +seed.value; });

  $("#ranges").addEventListener("change", e => {
    const t = e.target; if (!t.dataset.r) return;
    const r = S.ranges[+t.dataset.r], end = +t.dataset.e;
    const v = clamp(parseInt(t.value, 10) || BPM_MIN, BPM_MIN, BPM_MAX);
    r[end] = v; if (r[0] > r[1]) r[1 - end] = v;
    renderRanges();
    emit("ranges");
  });

  $("#genBtn").addEventListener("click", generate);
  $("#clearBtn").addEventListener("click", () => { S.data = []; dataChanged({ table: true }); });
}
