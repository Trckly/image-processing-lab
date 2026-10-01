/* Step 1 — dataset: generator, sequence plot, editable table. */
import { S, CLASSES, on } from "../../state.js";
import { $, card, hero, dot } from "../../core/dom.js";
import { drawSeqPlot, seqLegendHtml } from "../../components/seqPlot.js";
import { generatorCard, wireGenerator } from "./generator.js";
import { tableCard, renderTable, wireTable } from "./table.js";

export function mountData(view) {
  view.innerHTML = hero({
    icon: "database", step: "Крок 1 · Дані", title: "Підготовка вибірки",
    text: "Кожен приклад — чотири послідовні виміри ЧСС (уд/хв). Задайте діапазони класів, згенеруйте вибірку й за потреби відредагуйте приклади вручну.",
    aside: `<div class="hero-stats" id="dataStats"></div>`,
  }) + `
    <div class="grid-side">
      ${generatorCard()}
      <div class="stack">
        ${card({ icon: "chart", title: "Послідовності", sub: "Кожна лінія — один приклад; смуги — діапазони класів",
                 actions: `<div class="counts" id="counts"></div>`,
                 body: `<canvas id="dataPlot" class="plot" aria-label="Графік усіх послідовностей ЧСС"></canvas><div class="plot-legend">${seqLegendHtml()}</div>` })}
        ${tableCard()}
      </div>
    </div>`;

  wireGenerator();
  wireTable();

  const draw = () => drawSeqPlot($("#dataPlot"));
  const renderCounts = () => {
    const c = [0, 0, 0], te = S.data.filter(r => r.split === "test").length;
    S.data.forEach(r => c[r.y]++);
    $("#counts").innerHTML = CLASSES.map((k, i) => `<span class="chip">${dot(k.color)}${k.short} <b class="mono">${c[i]}</b></span>`).join("");
    $("#dataStats").innerHTML = [["усього", S.data.length], ["train", S.data.length - te], ["test", te]]
      .map(([k, v]) => `<div class="hstat"><b>${v}</b><span>${k}</span></div>`).join("");
  };

  on("data", d => { if (d?.table) renderTable(); renderCounts(); draw(); });
  on("ranges", draw);
  on("input", draw);
  on("redraw", draw);
  on("model", () => { $("#genBtn").disabled = S.training; });
}
