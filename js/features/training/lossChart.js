import { S } from "../../state.js";
import { css } from "../../core/dom.js";
import { prep, monoFont } from "../../core/canvas.js";

/** Loss on the left axis, train/test accuracy on the right axis (0–100%). */
export function drawLoss(cv) {
  const c = prep(cv); if (!c) return;
  const { ctx, w, h } = c;
  const L = 46, R = 42, T = 10, B = 28, pw = w - L - R, ph = h - T - B;
  const H = S.hist, N = Math.max(S.training ? S.targetEpochs : H.length, 10);
  const maxLoss = Math.max(0.1, ...H.map(e => e.loss)) * 1.05;
  const xv = i => L + pw * (i / (N - 1 || 1));
  const yl = v => T + ph * (1 - v / maxLoss), ya = v => T + ph * (1 - v);

  ctx.strokeStyle = css("--line"); ctx.lineWidth = 1; ctx.font = monoFont(10.5); ctx.fillStyle = css("--muted");
  for (let k = 0; k <= 4; k++) {
    const y = Math.round(T + ph * k / 4) + .5; ctx.beginPath(); ctx.moveTo(L, y); ctx.lineTo(L + pw, y); ctx.stroke();
    ctx.textAlign = "right"; ctx.textBaseline = "middle"; ctx.fillText((maxLoss * (1 - k / 4)).toFixed(2), L - 6, y);
    ctx.textAlign = "left"; ctx.fillText(Math.round(100 * (1 - k / 4)) + "%", L + pw + 6, y);
  }
  ctx.textAlign = "center"; ctx.textBaseline = "top";
  for (let k = 0; k <= 5; k++) { const ep = Math.round(1 + (N - 1) * k / 5); ctx.fillText(ep, xv(ep - 1), T + ph + 8); }
  if (!H.length) { ctx.fillText("Натисніть «Навчити», щоб побачити криву", L + pw / 2, T + ph / 2 - 8); return; }

  // soft fill under the loss curve
  const grad = ctx.createLinearGradient(0, T, 0, T + ph);
  grad.addColorStop(0, css("--accent")); grad.addColorStop(1, "transparent");
  ctx.globalAlpha = .12; ctx.fillStyle = grad; ctx.beginPath(); ctx.moveTo(xv(0), T + ph);
  H.forEach((e, i) => ctx.lineTo(xv(i), yl(e.loss))); ctx.lineTo(xv(H.length - 1), T + ph); ctx.fill(); ctx.globalAlpha = 1;

  const line = (key, scale, col, dash) => {
    ctx.strokeStyle = css(col); ctx.lineWidth = 2; ctx.setLineDash(dash || []); ctx.beginPath();
    let started = false;
    H.forEach((e, i) => { if (e[key] == null) return; const x = xv(i), y = scale(e[key]); started ? ctx.lineTo(x, y) : (ctx.moveTo(x, y), started = true); });
    ctx.stroke(); ctx.setLineDash([]);
    const last = H[H.length - 1];
    if (last[key] != null) { ctx.fillStyle = css(col); ctx.beginPath(); ctx.arc(xv(H.length - 1), scale(last[key]), 3.5, 0, Math.PI * 2); ctx.fill(); }
  };
  line("trainAcc", ya, "--c0"); line("testAcc", ya, "--c2", [5, 3]); line("loss", yl, "--accent");
}
