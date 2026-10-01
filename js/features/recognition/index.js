/* Step 3 — recognition: input sequence, network verdict, network state, synthetic ECG. */
import { S, CLASSES, BPM_MIN, BPM_MAX, on, emit, setInput, addExample, expectedByRanges } from "../../state.js";
import { gaussFrom, makeSeq } from "../../core/random.js";
import { $, card, hero, dot, fillRange } from "../../core/dom.js";
import { icon } from "../../core/icons.js";
import { isTrained } from "../../model/trainer.js";
import { drawSeqPlot, seqLegendHtml } from "../../components/seqPlot.js";
import { drawNet } from "./netDiagram.js";
import { drawECG } from "./ecg.js";

const PRESETS = [
  { name: "Норма", c: 0 }, { name: "Тахікардія", c: 1 }, { name: "Брадикардія", c: 2 },
  { name: "Випадкова", seq: () => [0, 1, 2, 3].map(() => BPM_MIN + Math.random() * (BPM_MAX - BPM_MIN)) },
  { name: "Межова 100", seq: () => [98, 103, 99, 102] },
  { name: "Нерегулярна", seq: () => [62, 128, 70, 140] },
];

export function mountRecognition(view) {
  view.innerHTML = hero({
    icon: "heartPulse", step: "Крок 3 · Розпізнавання", title: "Класифікація ритму",
    text: "Введіть чотири значення ЧСС або виберіть шаблон — мережа відповідає миттєво. Нижче видно стан нейронів, синтезовану ЕКГ і місце послідовності серед вибірки.",
  }) + `
    <div class="grid-side">
      ${card({ icon: "activity", title: "Вхідна послідовність", sub: "Чотири виміри ЧСС, уд/хв", body: `
        <div class="inputs">${[0, 1, 2, 3].map(i => `
          <div class="bpm">
            <label class="lbl" for="in${i}">Вимір ${i + 1}</label>
            <div class="bpm-val"><input type="number" id="in${i}" min="${BPM_MIN}" max="${BPM_MAX}" value="${S.input[i]}"><span>уд/хв</span></div>
            <input type="range" id="sl${i}" min="${BPM_MIN}" max="${BPM_MAX}" value="${S.input[i]}" aria-label="Вимір ${i + 1}, повзунок">
          </div>`).join("")}</div>
        <div class="lbl">${icon("layers", 13)} Шаблони</div>
        <div class="presets" id="presets">${PRESETS.map((p, i) =>
          `<button type="button" class="btn btn-sm" data-p="${i}">${p.c != null ? dot(CLASSES[p.c].color) : ""}${p.name}</button>`).join("")}</div>
        <div class="addrow">
          <span class="lbl">Додати в дані як</span>
          <select id="addAs" aria-label="Клас для нового прикладу">${CLASSES.map((k, i) => `<option value="${i}">${k.name}</option>`).join("")}</select>
          <button class="btn btn-sm" id="addAsBtn" type="button">${icon("plus", 14)}Додати</button>
        </div>
        <p class="note" id="addMsg" hidden></p>` })}
      <div class="stack">
        <div class="grid-2">
          ${card({ icon: "target", title: "Відповідь мережі", body: `
            <div class="verdict" id="verdict">
              <div class="verdict-heart">${icon("heart", 28)}</div>
              <div><div class="verdict-name" id="vName">—</div><div class="verdict-conf" id="vConf"></div></div>
            </div>
            <div class="bars">${CLASSES.map((k, i) => `
              <div class="bar"><span>${dot(k.color)}${k.name}</span>
                <div class="track"><div class="fill" id="bar${i}" style="background:var(${k.color})"></div></div>
                <span class="pct" id="pct${i}">0.0%</span></div>`).join("")}</div>
            <p class="note" id="ruleNote"></p>` })}
          ${card({ icon: "network", title: "Стан мережі", sub: "для поточного входу", body: `
            <svg id="netSvg" viewBox="0 0 380 250" role="img" aria-label="Схема нейромережі з вагами"></svg>
            <p class="note"><span style="color:var(--accent)">Червоний</span> — додатна вага, <span style="color:var(--c2)">синій</span> — від'ємна; товщина — модуль ваги. Заливка вузла — рівень активації.</p>` })}
        </div>
        ${card({ icon: "heartPulse", title: "Синтезована ЕКГ", sub: "II відведення, 25 мм/с умовно", body: `
          <canvas id="ecg" class="plot" aria-label="Синтезована ЕКГ"></canvas>
          <p class="note">Інтервали R–R обчислено як 60 / ЧСС; чотири значення повторюються циклічно у вікні 6 с.</p>` })}
        ${card({ icon: "chart", title: "Місце серед вибірки", sub: "Поточний вхід — жирна лінія", body: `
          <canvas id="recPlot" class="plot" aria-label="Поточна послідовність на тлі вибірки"></canvas>
          <div class="plot-legend">${seqLegendHtml()}</div>` })}
      </div>
    </div>`;

  const addAs = $("#addAs");
  let addAsTouched = false;

  const syncControls = () => {
    S.input.forEach((v, i) => { $("#in" + i).value = v; const sl = $("#sl" + i); sl.value = v; fillRange(sl); });
  };

  const render = () => {
    const exp = expectedByRanges(S.input), v = $("#verdict");
    let p = [0, 0, 0];
    if (!isTrained()) {
      v.style.removeProperty("--vc");
      $("#vName").textContent = "—";
      $("#vConf").textContent = "мережа ще не навчена (крок 2)";
    } else {
      const r = S.net.predict(S.input); p = r.p;
      v.style.setProperty("--vc", `var(${CLASSES[r.k].color})`);
      $("#vName").textContent = CLASSES[r.k].name;
      $("#vConf").textContent = `впевненість ${(p[r.k] * 100).toFixed(1)}%`;
      if (!addAsTouched) addAs.value = String(r.k);
    }
    v.style.setProperty("--beat", (60 / exp.mean).toFixed(2) + "s");
    p.forEach((pk, i) => { $("#bar" + i).style.width = (pk * 100).toFixed(1) + "%"; $("#pct" + i).textContent = (pk * 100).toFixed(1) + "%"; });
    $("#ruleNote").innerHTML = `Середня ЧСС <b class="mono">${exp.mean.toFixed(1)}</b> уд/хв. За заданими діапазонами це ${exp.c >= 0 ? `<b>${CLASSES[exp.c].name.toLowerCase()}</b>` : "<b>поза всіма діапазонами</b>"}.`;
    drawNet($("#netSvg"));
    drawECG($("#ecg"));
    drawSeqPlot($("#recPlot"));
  };

  for (let i = 0; i < 4; i++) {
    const num = $("#in" + i), sl = $("#sl" + i);
    num.addEventListener("input", () => {
      const v = parseInt(num.value, 10); if (isNaN(v)) return;
      S.input[i] = Math.min(BPM_MAX, Math.max(BPM_MIN, v)); sl.value = S.input[i]; fillRange(sl);
      emit("input");
    });
    num.addEventListener("change", () => { num.value = S.input[i]; });
    sl.addEventListener("input", () => { S.input[i] = +sl.value; num.value = S.input[i]; emit("input"); });
  }
  $("#presets").addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const p = PRESETS[+b.dataset.p];
    setInput(p.c != null ? makeSeq(S.ranges[p.c], S.cfg.jitter || 3, Math.random, gaussFrom(Math.random)) : p.seq());
  });
  addAs.addEventListener("change", () => addAsTouched = true);
  $("#addAsBtn").addEventListener("click", () => {
    const y = +addAs.value, id = addExample(S.input, y), m = $("#addMsg");
    m.hidden = false;
    m.textContent = `Додано приклад #${id} [${S.input.join(", ")}] як «${CLASSES[y].name}» у train. Перенавчіть мережу, щоб врахувати його.`;
  });

  on("input", d => { if (d?.external) { syncControls(); addAsTouched = false; } render(); });
  on("model", render);
  on("ranges", render);
  on("data", () => drawSeqPlot($("#recPlot")));
  on("redraw", render);
}
