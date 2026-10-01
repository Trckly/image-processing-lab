/* Entry point: mounts the shell and each feature module, then boots with generated data + a first training run. */
import { emit } from "./state.js";
import { $$, fillRange } from "./core/dom.js";
import { mountShell } from "./shell.js";
import { mountData } from "./features/data/index.js";
import { generate } from "./features/data/generator.js";
import { mountTraining } from "./features/training/index.js";
import { mountRecognition } from "./features/recognition/index.js";
import { startTraining } from "./model/trainer.js";

const ROUTES = [
  { id: "data",      no: "01", title: "Дані",          icon: "database",   mount: mountData },
  { id: "train",     no: "02", title: "Навчання",      icon: "network",    mount: mountTraining },
  { id: "recognize", no: "03", title: "Розпізнавання", icon: "heartPulse", mount: mountRecognition },
];

mountShell(ROUTES);

document.addEventListener("input", e => { if (e.target.matches?.('input[type="range"]')) fillRange(e.target); });
$$('input[type="range"]').forEach(fillRange);

let rt;
addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(() => emit("redraw"), 120); });
try { matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => setTimeout(() => emit("redraw"), 30)); } catch (e) {}

generate();
startTraining();
document.fonts?.ready.then(() => emit("redraw"));
