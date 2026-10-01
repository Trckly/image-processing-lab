/* All dataset sequences as lines over class bands, with the current input drawn on top.
   Used by both the Data and the Recognition views. */
import { S, CLASSES, BPM_MIN, BPM_MAX } from "../state.js";
import { css } from "../core/dom.js";
import { prep, monoFont } from "../core/canvas.js";

export function drawSeqPlot(cv) {
  const c = prep(cv); if (!c) return;
  const { ctx, w, h } = c;
  const L = 44, R = 30, T = 10, B = 30, pw = w - L - R, ph = h - T - B;
  const yv = v => T + ph * (1 - (v - BPM_MIN) / (BPM_MAX - BPM_MIN));
  const xv = i => L + pw * (i / 3);

  S.ranges.forEach(([lo, hi], k) => { ctx.globalAlpha = .1; ctx.fillStyle = css(CLASSES[k].color); ctx.fillRect(L, yv(hi + .5), pw, yv(lo - .5) - yv(hi + .5)); });
  ctx.globalAlpha = 1;

  ctx.strokeStyle = css("--line"); ctx.lineWidth = 1; ctx.fillStyle = css("--muted"); ctx.font = monoFont(10.5);
  ctx.textAlign = "right"; ctx.textBaseline = "middle";
  for (let v = 40; v <= 200; v += 20) { const y = Math.round(yv(v)) + .5; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + pw, y); ctx.stroke(); ctx.fillText(v, L - 6, y); }
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (let i = 0; i < 4; i++) { const x = Math.round(xv(i)) + .5; ctx.beginPath(); ctx.moveTo(x, T); ctx.lineTo(x, T + ph); ctx.stroke(); ctx.fillText("вимір " + (i + 1), x, T + ph + 8); }

  const n = S.data.length, alpha = n > 300 ? .18 : n > 120 ? .28 : .45;
  ctx.lineWidth = 1.2; ctx.lineJoin = "round";
  for (const r of S.data) {
    ctx.globalAlpha = alpha; ctx.strokeStyle = css(CLASSES[r.y].color);
    ctx.setLineDash(r.split === "test" ? [3, 3] : []);
    ctx.beginPath(); r.x.forEach((v, i) => i ? ctx.lineTo(xv(i), yv(v)) : ctx.moveTo(xv(i), yv(v))); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.globalAlpha = 1;

  ctx.strokeStyle = css("--ink"); ctx.lineWidth = 2.6;
  ctx.beginPath(); S.input.forEach((v, i) => i ? ctx.lineTo(xv(i), yv(v)) : ctx.moveTo(xv(i), yv(v))); ctx.stroke();
  ctx.fillStyle = css("--panel");
  S.input.forEach((v, i) => { ctx.beginPath(); ctx.arc(xv(i), yv(v), 4, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); });

  ctx.save(); ctx.translate(11, T + ph / 2); ctx.rotate(-Math.PI / 2);
  ctx.fillStyle = css("--muted"); ctx.textAlign = "center"; ctx.textBaseline = "middle"; ctx.font = monoFont(10.5);
  ctx.fillText("уд/хв", 0, 0); ctx.restore();
}

export const seqLegendHtml = () =>
  CLASSES.map(k => `<span><i class="swatch" style="background:var(${k.color})"></i>${k.name}</span>`).join("") +
  `<span><i class="swatch swatch-dash"></i>тестові приклади</span>` +
  `<span><i class="swatch" style="background:var(--ink);height:4px"></i>поточний вхід</span>`;
