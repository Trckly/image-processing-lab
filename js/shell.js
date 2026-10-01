/* App chrome: sidebar navigation, sticky top bar with live KPIs, hash router, theme toggle. */
import { S, CLASSES, on, emit, testRows } from "./state.js";
import { $, $$, dot, fmtPct } from "./core/dom.js";
import { icon } from "./core/icons.js";
import { evaluate, isTrained } from "./model/trainer.js";

const ECG = "M0 20 H40 l5 -3 l5 3 H62 l3 4 l5 -18 l5 24 l3 -10 H96 q7 -8 14 0 H140 l5 -3 l5 3 H162 l3 4 l5 -18 l5 24 l3 -10 H196 q7 -8 14 0 H240";

export function mountShell(routes) {
  $("#sidebar").innerHTML = `
    <a class="brand" href="#${routes[0].id}">
      <span class="brand-mark">${icon("heart", 22)}</span>
      <span><span class="brand-name">Кардіоритм</span><span class="brand-sub">нейромережевий класифікатор</span></span>
    </a>
    <svg class="brand-ecg" viewBox="0 0 240 36" preserveAspectRatio="none" aria-hidden="true"><path d="${ECG}" pathLength="100"/></svg>
    <div class="nav-label">Модулі</div>
    <nav class="nav" aria-label="Модулі застосунку">${routes.map(r => `
      <a class="nav-item" href="#${r.id}" data-route="${r.id}">
        <span class="nav-ic">${icon(r.icon, 17)}</span>
        <span class="nav-txt"><span class="nav-title">${r.title}</span><span class="nav-meta" id="meta-${r.id}">…</span></span>
        <span class="nav-no">${r.no}</span>
      </a>`).join("")}
    </nav>
    <div class="nav-label">Класи та діапазони</div>
    <div class="side-legend" id="sideLegend"></div>
    <p class="side-foot">Навчальна модель. Дані синтетичні, класифікація не є медичним висновком.</p>`;

  $("#topbar").innerHTML = `
    <div class="crumbs"><span>Кардіоритм</span><span class="sep">/</span><b id="crumb"></b></div>
    <div class="top-right">
      <span class="tchip hide-sm">Приклади <b id="tkData">0</b></span>
      <span class="tchip hide-sm">Точність test <b id="tkAcc">—</b></span>
      <span class="pill idle" id="tkStatus">не навчена</span>
      <button class="btn btn-ghost icon-btn" id="themeBtn" type="button" aria-label="Перемкнути тему"></button>
    </div>`;

  const viewsEl = $("#views");
  routes.forEach((r, i) => {
    const sec = document.createElement("section");
    sec.className = "view"; sec.id = "view-" + r.id; sec.dataset.view = r.id;
    sec.setAttribute("aria-labelledby", "crumb");
    viewsEl.append(sec);
    r.mount(sec);
    const prev = routes[i - 1], next = routes[i + 1];
    sec.insertAdjacentHTML("beforeend", `<nav class="pager">
      ${prev ? `<a class="prev" href="#${prev.id}">${icon("arrowLeft", 18)}<span><small>Назад</small><b>${prev.title}</b></span></a>` : ""}
      ${next ? `<a class="next" href="#${next.id}"><span><small>Далі</small><b>${next.title}</b></span>${icon("arrowRight", 18)}</a>` : ""}
    </nav>`);
  });

  /* router */
  const show = () => {
    const want = location.hash.slice(1), r = routes.find(x => x.id === want) || routes[0];
    $$(".view").forEach(v => v.classList.toggle("active", v.dataset.view === r.id));
    $$(".nav-item").forEach(a => a.dataset.route === r.id ? a.setAttribute("aria-current", "page") : a.removeAttribute("aria-current"));
    $("#crumb").textContent = r.title;
    document.title = `${r.title} · Кардіоритм-класифікатор`;
    emit("route", r.id);
    requestAnimationFrame(() => emit("redraw"));
  };
  addEventListener("hashchange", () => { show(); scrollTo({ top: 0 }); });
  show();

  /* theme */
  const root = document.documentElement, btn = $("#themeBtn");
  const isDark = () => root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  const syncThemeBtn = () => { btn.innerHTML = icon(isDark() ? "sun" : "moon", 17); };
  btn.addEventListener("click", () => {
    const next = isDark() ? "light" : "dark";
    root.dataset.theme = next;
    try { localStorage.setItem("theme", next); } catch (e) {}
    syncThemeBtn();
    emit("redraw");
  });
  try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", syncThemeBtn); } catch (e) {}
  syncThemeBtn();

  /* live status in nav + top bar */
  const legend = () => {
    $("#sideLegend").innerHTML = CLASSES.map((k, i) =>
      `<div class="legend-item">${dot(k.color)}<span>${k.name}</span><span class="mono">${S.ranges[i][0]}–${S.ranges[i][1]}</span></div>`).join("");
  };
  const status = () => {
    const acc = isTrained() ? evaluate(testRows()).acc : null;
    $("#meta-data").textContent = S.data.length ? `${S.data.length} у вибірці` : "вибірка порожня";
    $("#tkData").textContent = S.data.length;
    $("#tkAcc").textContent = fmtPct(acc);

    let cls, txt;
    if (S.training) { cls = "run"; txt = `епоха ${S.hist.length}/${S.targetEpochs}`; }
    else if (!S.net) { cls = "idle"; txt = "не навчена"; }
    else if (S.stale) { cls = "stale"; txt = "перенавчіть"; }
    else { cls = "ok"; txt = "навчена"; }
    const st = $("#tkStatus"); st.className = "pill " + cls; st.textContent = txt;
    $("#meta-train").textContent = cls === "ok" ? `навчена · ${fmtPct(acc)}` : txt;
    statusRecognize();
  };
  const statusRecognize = () => {
    const m = $("#meta-recognize");
    if (!isTrained()) { m.textContent = "очікує мережу"; return; }
    const { k } = S.net.predict(S.input);
    m.innerHTML = `${dot(CLASSES[k].color)} ${CLASSES[k].name}`;
  };

  legend();
  on("ranges", legend);
  on("data", status);
  on("model", status);
  on("input", statusRecognize);
}
