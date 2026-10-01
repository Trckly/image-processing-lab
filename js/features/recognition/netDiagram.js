import { S, CLASSES } from "../../state.js";
import { clamp } from "../../core/random.js";

/** SVG of the network for the current input: edge colour = weight sign, width = |weight|, node fill = activation. */
export function drawNet(svg) {
  const W = 380, H = 250;
  const net = S.net, nH = net ? net.nH : S.cfg.hidden, act = net ? net.act : S.cfg.act;
  const colX = [44, 190, 300];
  const ys = n => Array.from({ length: n }, (_, i) => n === 1 ? H / 2 : 22 + (H - 44) * i / (n - 1));
  const yIn = ys(4), yH = ys(nH), yOut = ys(3).map(y => 60 + (y - 22) * (130 / 206));
  const fw = net ? net.forward(S.input) : null;
  let maxW = 0.001;
  if (net) net.W1.flat().concat(net.W2.flat()).forEach(v => maxW = Math.max(maxW, Math.abs(v)));

  let s = "";
  const edge = (x1, y1, x2, y2, wv) => {
    const a = Math.abs(wv) / maxW;
    s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:var(${wv >= 0 ? "--accent" : "--c2"})" stroke-width="${(0.4 + a * 2.6).toFixed(2)}" stroke-opacity="${(0.12 + a * 0.75).toFixed(2)}"/>`;
  };
  const plain = (x1, y1, x2, y2) => { s += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="stroke:var(--line)"/>`; };
  for (let j = 0; j < nH; j++) for (let i = 0; i < 4; i++) net ? edge(colX[0], yIn[i], colX[1], yH[j], net.W1[j][i]) : plain(colX[0], yIn[i], colX[1], yH[j]);
  for (let k = 0; k < 3; k++) for (let j = 0; j < nH; j++) net ? edge(colX[1], yH[j], colX[2], yOut[k], net.W2[k][j]) : plain(colX[1], yH[j], colX[2], yOut[k]);

  const node = (x, y, r, fillVar, op, label, anchor, lx) => {
    s += `<circle cx="${x}" cy="${y}" r="${r}" style="fill:var(--panel);stroke:var(--ink)" stroke-width="1.2"/>`;
    s += `<circle cx="${x}" cy="${y}" r="${r}" style="fill:var(${fillVar})" fill-opacity="${op.toFixed(2)}"/>`;
    if (label) s += `<text x="${lx}" y="${y + 4}" text-anchor="${anchor}" style="fill:var(--ink);font:11px var(--font-mono)">${label}</text>`;
  };
  yIn.forEach((y, i) => node(colX[0], y, 9, "--ink", fw ? clamp((fw.x[i] + 2) / 4, 0, 1) * .6 : 0, String(S.input[i]), "end", colX[0] - 14));
  yH.forEach((y, j) => {
    let a = 0;
    if (fw) { const hv = fw.h[j]; a = act === "tanh" ? (hv + 1) / 2 : act === "relu" ? clamp(hv / 3, 0, 1) : hv; }
    node(colX[1], y, nH > 10 ? 6 : 8, "--ink", a * .7, "", "", 0);
  });
  yOut.forEach((y, k) => node(colX[2], y, 11, CLASSES[k].color, fw ? fw.p[k] : 0, `${CLASSES[k].short} ${fw ? (fw.p[k] * 100).toFixed(0) + "%" : ""}`, "start", colX[2] + 17));

  const cap = (x, t) => { s += `<text x="${x}" y="${H - 2}" text-anchor="middle" style="fill:var(--muted);font:10px var(--font-body)">${t}</text>`; };
  cap(colX[0], "входи"); cap(colX[1], `прихований (${nH})`); cap(colX[2], "виходи");
  svg.innerHTML = s;
}
