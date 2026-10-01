/* Step 2 — network training: hyperparameters, live KPIs, learning curve, confusion matrix. */
import { S, on, emit, trainRows, testRows } from "../../state.js";
import { $, card, hero, slider, bindRange, fmtPct } from "../../core/dom.js";
import { icon } from "../../core/icons.js";
import { evaluate, startTraining, stopTraining, resetNet } from "../../model/trainer.js";
import { drawLoss } from "./lossChart.js";
import { confusionHtml, recallHtml } from "./confusion.js";

const ACTS = [["sigmoid", "Сигмоїда"], ["tanh", "tanh"], ["relu", "ReLU"]];

const kpi = (id, label, color, extra = "") =>
  `<div class="kpi" style="--kc:var(${color})"><div class="kpi-k">${label}</div><div class="kpi-v" id="${id}">—</div>${extra}</div>`;

export function mountTraining(view) {
  view.innerHTML = hero({
    icon: "network", step: "Крок 2 · Навчання", title: "Навчання нейромережі",
    text: "Багатошаровий перцептрон: 4 нормовані входи → прихований шар → 3 виходи softmax. Стохастичний градієнтний спуск, функція втрат — перехресна ентропія.",
    aside: `<div class="arch" aria-label="Архітектура мережі"><span>4</span><i>→</i><span class="h" id="archH">${S.cfg.hidden}</span><i>→</i><span>3</span></div>
            <div class="arch-cap">входи · прихований · виходи</div>`,
  }) + `
    <div class="kpi-row">
      ${kpi("kEpoch", "Епоха", "--accent", `<div class="progress" id="kProg"><i></i></div>`)}
      ${kpi("kLoss", "Втрати (train)", "--c1")}
      ${kpi("kTrain", "Точність train", "--c0")}
      ${kpi("kTest", "Точність test", "--c2")}
    </div>
    <div class="grid-side">
      ${card({ icon: "sliders", title: "Параметри", sub: "Зміна архітектури скидає ваги", body: `
        ${slider("hidden", "Нейронів у прихованому шарі", { min: 2, max: 16, step: 1, value: S.cfg.hidden })}
        <div class="field"><span class="lbl" id="actLbl">Функція активації</span>
          <div class="seg" role="radiogroup" aria-labelledby="actLbl">${ACTS.map(([v, n]) =>
            `<label><input type="radio" name="act" value="${v}"${v === S.cfg.act ? " checked" : ""}><span>${n}</span></label>`).join("")}</div></div>
        ${slider("lr", "Швидкість навчання", { min: 0.005, max: 1, step: 0.005, value: S.cfg.lr })}
        ${slider("epochs", "Епох", { min: 10, max: 1000, step: 10, value: S.cfg.epochs })}
        <div class="btns">
          <button class="btn btn-primary btn-grow" id="trainBtn" type="button">${icon("play", 15)}Навчити</button>
          <button class="btn" id="stopBtn" type="button" disabled>${icon("stop", 15)}Стоп</button>
          <button class="btn btn-ghost" id="resetBtn" type="button" title="Скинути ваги" aria-label="Скинути ваги">${icon("reset", 15)}</button>
        </div>
        <div class="status" id="trainStatus"></div>` })}
      <div class="grid-2">
        ${card({ icon: "chart", title: "Крива навчання", sub: "Втрати та точність по епохах", body: `
          <canvas id="lossPlot" class="plot" aria-label="Графік втрат і точності по епохах"></canvas>
          <div class="plot-legend">
            <span><i class="swatch" style="background:var(--accent)"></i>Втрати (ліва шкала)</span>
            <span><i class="swatch" style="background:var(--c0)"></i>Точність train</span>
            <span><i class="swatch" style="background:var(--c2)"></i>Точність test</span>
          </div>` })}
        ${card({ icon: "grid", title: "Матриця помилок", sub: "Тестова вибірка", body: `
          <div class="cm-wrap"><table class="cm" id="cm"></table></div>
          <div class="lbl" style="margin-top:14px">Повнота за класами</div>
          <div class="recalls" id="recalls"></div>` })}
      </div>
    </div>`;

  let lastError = "";
  const resetIfIdle = () => { if (!S.training) resetNet(); };
  bindRange("hidden", v => v, v => { S.cfg.hidden = +v; $("#archH").textContent = v; resetIfIdle(); });
  bindRange("lr", v => (+v).toFixed(3), v => S.cfg.lr = +v);
  bindRange("epochs", v => v, v => S.cfg.epochs = +v);
  view.querySelector(".seg").addEventListener("change", e => { S.cfg.act = e.target.value; resetIfIdle(); });
  $("#trainBtn").addEventListener("click", () => { lastError = ""; startTraining(); });
  $("#stopBtn").addEventListener("click", stopTraining);
  $("#resetBtn").addEventListener("click", resetNet);

  const render = () => {
    $("#trainBtn").disabled = S.training;
    $("#stopBtn").disabled = !S.training;

    let pill;
    if (lastError) pill = `<span class="pill stale">${lastError}</span>`;
    else if (S.training) pill = `<span class="pill run">навчається…</span>`;
    else if (!S.net) pill = `<span class="pill idle">не навчена</span>`;
    else if (S.stale) pill = `<span class="pill stale">дані змінено — перенавчіть</span>`;
    else pill = `<span class="pill ok">навчена</span>`;
    $("#trainStatus").innerHTML = pill;

    const last = S.hist[S.hist.length - 1];
    const te = evaluate(testRows()), tr = evaluate(trainRows());
    const total = S.training ? S.targetEpochs : Math.max(S.hist.length, S.cfg.epochs);
    $("#kEpoch").innerHTML = `${S.hist.length}<small> / ${total}</small>`;
    $("#kProg").firstElementChild.style.width = (S.hist.length / total * 100).toFixed(1) + "%";
    $("#kProg").classList.toggle("run", S.training);
    $("#kLoss").textContent = last ? last.loss.toFixed(4) : "—";
    $("#kTrain").innerHTML = `${fmtPct(tr.acc)}<small> n=${trainRows().length}</small>`;
    $("#kTest").innerHTML = `${fmtPct(te.acc)}<small> n=${testRows().length}</small>`;

    drawLoss($("#lossPlot"));
    $("#cm").innerHTML = confusionHtml(te.cm);
    $("#recalls").innerHTML = recallHtml(te.cm);
  };

  on("model", d => { lastError = d?.error || ""; render(); });
  on("data", render);
  on("redraw", () => drawLoss($("#lossPlot")));
  emit("model");
}
