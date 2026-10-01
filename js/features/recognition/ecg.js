import { S, BPM_MIN, BPM_MAX } from "../../state.js";
import { clamp } from "../../core/random.js";
import { css } from "../../core/dom.js";
import { prep, monoFont } from "../../core/canvas.js";

/** One PQRST complex as a sum of Gaussians; dt is seconds from the R peak. */
function pqrst(dt, rr) {
  const g = (mu, a, w) => a * Math.exp(-((dt - mu) ** 2) / (2 * w * w));
  const qt = 0.27 * Math.sqrt(rr);
  return g(-0.16, 0.12, 0.024) + g(-0.035, -0.12, 0.009) + g(0, 1, 0.011) + g(0.035, -0.24, 0.011) + g(qt, 0.27, 0.045);
}

/** 6-second strip on ECG paper; the four BPM values repeat cyclically as R–R intervals. */
export function drawECG(cv) {
  const c = prep(cv); if (!c) return;
  const { ctx, w, h } = c;
  const win = 6, pps = w / win, sq = 0.04 * pps;
  ctx.fillStyle = css("--paper"); ctx.fillRect(0, 0, w, h);
  ctx.lineWidth = 1;
  const vline = x => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke(); };
  const hline = y => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); };
  ctx.strokeStyle = css("--grid");
  for (let t = 0; t <= win; t += 0.04) vline(Math.round(t * pps) + .5);
  for (let y = h; y >= 0; y -= sq) hline(Math.round(y) + .5);
  ctx.strokeStyle = css("--grid-strong");
  for (let t = 0; t <= win; t += 0.2) vline(Math.round(t * pps) + .5);
  for (let y = h; y >= 0; y -= sq * 5) hline(Math.round(y) + .5);

  const beats = []; let t = 0.35, i = 0;
  while (t < win + 0.5 && i < 200) { const bpm = clamp(S.input[i % 4], BPM_MIN, BPM_MAX); beats.push({ t, rr: 60 / bpm, bpm }); t += 60 / bpm; i++; }
  const base = h * 0.66, amp = h * 0.5;
  ctx.strokeStyle = css("--accent"); ctx.lineWidth = 1.7; ctx.lineJoin = "round"; ctx.beginPath();
  for (let px = 0; px <= w; px++) {
    const tt = px / pps; let v = 0;
    for (const b of beats) { const d = tt - b.t; if (d > -0.4 && d < 0.8) v += pqrst(d, b.rr); }
    const y = base - v * amp; px ? ctx.lineTo(px, y) : ctx.moveTo(px, y);
  }
  ctx.stroke();

  ctx.fillStyle = css("--ink"); ctx.font = monoFont(10.5); ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (const b of beats) { const x = b.t * pps; if (x > 10 && x < w - 10) ctx.fillText(b.bpm, x, 4); }
  ctx.fillStyle = css("--muted"); ctx.textAlign = "left"; ctx.textBaseline = "bottom"; ctx.fillText("1 с", 6, h - 4);
  ctx.strokeStyle = css("--muted"); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(28, h - 9); ctx.lineTo(28 + pps, h - 9); ctx.stroke();
}
