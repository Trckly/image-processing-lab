import { icon } from "./icons.js";

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
export const css = n => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
export const dot = color => `<i class="dot" style="background:var(${color})"></i>`;
export const fmtPct = v => v == null ? "—" : (v * 100).toFixed(1) + "%";

/** Custom range track paints its filled part from --p. */
export function fillRange(el) {
  const p = ((el.value - el.min) / (el.max - el.min)) * 100;
  el.style.setProperty("--p", p + "%");
}

/** Wire a slider made by slider(): keeps its <output> in sync and reports changes. */
export function bindRange(id, fmt, onInput) {
  const el = $("#" + id), out = $("#" + id + "Out");
  const sync = () => { out.textContent = fmt(el.value); fillRange(el); };
  el.addEventListener("input", () => { sync(); onInput?.(el.value); });
  sync();
  return el;
}

/* ---------- templates ---------- */
export const slider = (id, label, { min, max, step, value }) => `
  <div class="field">
    <div class="field-top"><label for="${id}">${label}</label><output id="${id}Out">${value}</output></div>
    <input type="range" id="${id}" min="${min}" max="${max}" step="${step}" value="${value}">
  </div>`;

export const card = ({ icon: ic, title, sub = "", actions = "", body, cls = "" }) => `
  <section class="card ${cls}">
    <header class="card-head">
      <span class="card-ic">${icon(ic, 16)}</span>
      <div class="card-titles"><h3 class="card-title">${title}</h3>${sub ? `<p class="card-sub">${sub}</p>` : ""}</div>
      ${actions ? `<div class="card-actions">${actions}</div>` : ""}
    </header>
    <div class="card-body">${body}</div>
  </section>`;

const TRACE = "M0 70 H120 l10 -8 l10 8 H170 l6 10 l10 -60 l10 80 l6 -30 H260 q16 -18 32 0 H360 l10 -8 l10 8 H410 l6 10 l10 -60 l10 80 l6 -30 H500 q16 -18 32 0 H600";

export const hero = ({ icon: ic, step, title, text, aside = "" }) => `
  <section class="hero">
    <svg class="hero-trace" viewBox="0 0 600 120" preserveAspectRatio="none" aria-hidden="true"><path d="${TRACE}"/></svg>
    <div class="hero-ic">${icon(ic, 26)}</div>
    <div class="hero-txt"><div class="eyebrow">${step}</div><h2>${title}</h2><p>${text}</p></div>
    ${aside ? `<div class="hero-aside">${aside}</div>` : ""}
  </section>`;
