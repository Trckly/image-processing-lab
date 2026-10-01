import { S, CLASSES } from "../../state.js";
import { dot, fmtPct } from "../../core/dom.js";

export function confusionHtml(cm) {
  const max = Math.max(1, ...cm.flat());
  const head = `<tr><th></th><th colspan="3" class="lbl">Прогноз мережі →</th></tr>
    <tr><th class="lbl rowh">Справжній ↓</th>${CLASSES.map(k => `<th title="${k.name}">${dot(k.color)} ${k.short}</th>`).join("")}</tr>`;
  const body = cm.map((row, i) => `<tr><th class="rowh">${CLASSES[i].name}</th>${row.map((v, j) => {
    const a = v / max, col = i === j ? CLASSES[i].color : "--accent";
    return `<td class="cell" style="background:color-mix(in srgb, var(${col}) ${Math.round(a * 70 + (v ? 8 : 0))}%, transparent);color:${a > .55 ? "var(--panel)" : "var(--ink)"}">${S.net ? v : "—"}</td>`;
  }).join("")}</tr>`).join("");
  return head + body;
}

export function recallHtml(cm) {
  return CLASSES.map((k, i) => {
    const s = cm[i].reduce((a, b) => a + b, 0), r = S.net && s ? cm[i][i] / s : null;
    return `<div class="recall">${dot(k.color)}<span>${k.name}</span>
      <div class="track"><div class="fill" style="width:${((r ?? 0) * 100).toFixed(1)}%;background:var(${k.color})"></div></div>
      <b class="mono">${fmtPct(r)}</b></div>`;
  }).join("");
}
