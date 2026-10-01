import { S, CLASSES, BPM_MIN, BPM_MAX, dataChanged, addExample, expectedByRanges } from "../../state.js";
import { clamp } from "../../core/random.js";
import { $, card } from "../../core/dom.js";
import { icon } from "../../core/icons.js";

export const tableCard = () => card({
  icon: "table", title: "Таблиця прикладів", sub: "Редагуйте значення, клас і вибірку",
  actions: `
    <select id="filter" aria-label="Фільтр за класом"><option value="all">Усі класи</option>${CLASSES.map((k, i) => `<option value="${i}">${k.name}</option>`).join("")}</select>
    <button class="btn btn-sm" id="addRowBtn" type="button">${icon("plus", 15)}Рядок</button>`,
  body: `
    <div class="table-wrap"><table class="data-table" id="dataTable">
      <thead><tr><th>#</th><th>ЧСС 1</th><th>ЧСС 2</th><th>ЧСС 3</th><th>ЧСС 4</th><th>Клас</th><th>Вибірка</th><th></th></tr></thead>
      <tbody></tbody></table></div>
    <p class="note">${icon("info", 14)} Клацніть на мітку «train/test», щоб перенести приклад між вибірками. Зміни одразу видно на графіку.</p>`,
});

export function renderTable() {
  const f = $("#filter").value;
  const rows = S.data.filter(r => f === "all" || r.y === +f);
  const opts = y => CLASSES.map((k, i) => `<option value="${i}"${i === y ? " selected" : ""}>${k.name}</option>`).join("");
  $("#dataTable").tBodies[0].innerHTML = rows.length ? rows.map(r => `<tr data-id="${r.id}">
    <td class="idx" style="border-left-color:var(${CLASSES[r.y].color})">${r.id}</td>
    ${r.x.map((v, i) => `<td><input type="number" min="${BPM_MIN}" max="${BPM_MAX}" value="${v}" data-i="${i}" aria-label="ЧСС ${i + 1}, приклад ${r.id}"></td>`).join("")}
    <td><select data-k="y" aria-label="Клас прикладу ${r.id}">${opts(r.y)}</select></td>
    <td><button type="button" class="split ${r.split}" data-k="split">${r.split}</button></td>
    <td><button type="button" class="del" data-k="del" aria-label="Видалити приклад ${r.id}">${icon("trash", 15)}</button></td></tr>`).join("")
    : `<tr><td colspan="8" class="empty">Даних немає. Натисніть «Згенерувати» або додайте рядок вручну.</td></tr>`;
}

export function wireTable() {
  $("#filter").addEventListener("change", renderTable);
  $("#addRowBtn").addEventListener("click", () => {
    const f = $("#filter").value;
    const y = f === "all" ? expectedByRanges(S.input).c : +f;
    addExample(S.input, y >= 0 ? y : 0);
    $("#dataTable").parentElement.scrollTop = 0;
  });

  const tbody = $("#dataTable").tBodies[0];
  tbody.addEventListener("change", e => {
    const tr = e.target.closest("tr"); if (!tr) return;
    const r = S.data.find(d => d.id === +tr.dataset.id); if (!r) return;
    if (e.target.dataset.i != null) {
      const v = clamp(parseInt(e.target.value, 10) || BPM_MIN, BPM_MIN, BPM_MAX);
      r.x[+e.target.dataset.i] = v; e.target.value = v;
      dataChanged();
    } else if (e.target.dataset.k === "y") {
      r.y = +e.target.value;
      tr.cells[0].style.borderLeftColor = `var(${CLASSES[r.y].color})`;
      dataChanged({ table: $("#filter").value !== "all" });
    }
  });
  tbody.addEventListener("click", e => {
    const b = e.target.closest("button"); if (!b) return;
    const tr = b.closest("tr"), idx = S.data.findIndex(d => d.id === +tr.dataset.id); if (idx < 0) return;
    if (b.dataset.k === "del") {
      S.data.splice(idx, 1); tr.remove();
      dataChanged({ table: !S.data.length });
    } else if (b.dataset.k === "split") {
      const r = S.data[idx]; r.split = r.split === "train" ? "test" : "train";
      b.textContent = r.split; b.className = "split " + r.split;
      dataChanged();
    }
  });
}
