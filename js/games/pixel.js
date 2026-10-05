import { h } from "../core.js";

const N = 10;

export function makePuzzle(r) {
  // Random noise smoothed by a few cellular-automaton passes gives blobby, picture-like shapes.
  let g = Array.from({ length: N * N }, () => (r() < 0.55 ? 1 : 0));
  for (let pass = 0; pass < 3; pass++) {
    g = g.map((v, i) => {
      const y = Math.floor(i / N), x = i % N;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const yy = y + dy, xx = x + dx;
        if (yy >= 0 && yy < N && xx >= 0 && xx < N) n += g[yy * N + xx];
      }
      return n >= 5 ? 1 : n <= 3 ? 0 : v;
    });
  }
  // Never leave an empty row or column: it makes the puzzle dull.
  for (let k = 0; k < N; k++) {
    if (!g.slice(k * N, k * N + N).some(Boolean)) g[k * N + Math.floor(r() * N)] = 1;
    if (!Array.from({ length: N }, (_, y) => g[y * N + k]).some(Boolean)) g[Math.floor(r() * N) * N + k] = 1;
  }
  return g;
}

export const clue = (line) => {
  const out = [];
  let run = 0;
  for (const v of line) { if (v === 1) run++; else if (run) { out.push(run); run = 0; } }
  if (run) out.push(run);
  return out.length ? out : [0];
};
const rowOf = (g, y) => g.slice(y * N, y * N + N);
const colOf = (g, x) => Array.from({ length: N }, (_, y) => g[y * N + x]);

export default {
  id: "pixel",
  name: "Pixel",
  cat: "logic",
  tint: "paper",
  blurb: "Paint the hidden picture from number clues.",
  rules: `The numbers beside each row and column list the runs of filled cells, in order.
    Fill cells to match every clue. Switch to the cross tool to mark cells you know are empty. Drag to paint several cells.`,
  cover: () => {
    const pic = "0011100001111100110101101111111011111110010101000100010000000000";
    let s = "";
    for (let i = 0; i < 64; i++) {
      const x = 52 + (i % 8) * 10, y = 22 + Math.floor(i / 8) * 10;
      s += `<rect x="${x}" y="${y}" width="10" height="10" class="${pic[i] === "1" ? "t-ink" : "t-card"}"/>`;
    }
    return s + `<text x="44" y="30" class="tl xs">3</text><text x="44" y="40" class="tl xs">5</text>
      <text x="57" y="16" class="tl xs">2</text><text x="67" y="16" class="tl xs">4</text>`;
  },
  mount(root, ctx) {
    const sol = makePuzzle(ctx.rng);
    const st = ctx.state || { cells: Array(N * N).fill(0) }; // 0 blank, 1 fill, 2 cross
    let tool = 1, painting = null;

    const table = h("div", { class: "pixel", style: { "--n": N } });
    const colClues = Array.from({ length: N }, (_, x) => h("div", { class: "pc col" }, clue(colOf(sol, x)).map((n) => h("span", {}, n))));
    const rowClues = Array.from({ length: N }, (_, y) => h("div", { class: "pc row" }, clue(rowOf(sol, y)).map((n) => h("span", {}, n))));
    const cells = [];
    table.append(h("div", { class: "pc corner" }), ...colClues);
    for (let y = 0; y < N; y++) {
      table.append(rowClues[y]);
      for (let x = 0; x < N; x++) {
        const i = y * N + x;
        const el = h("div", { class: "px" + (x % 5 === 4 && x < N - 1 ? " br" : "") + (y % 5 === 4 && y < N - 1 ? " bb" : ""), "data-i": i });
        cells.push(el);
        table.append(el);
      }
    }
    const fillBtn = h("button", { class: "btn ghost on", onclick: () => setTool(1) }, "Fill");
    const crossBtn = h("button", { class: "btn ghost", onclick: () => setTool(2) }, "Cross");
    root.append(table, h("div", { class: "row-c" }, fillBtn, crossBtn,
      h("button", { class: "btn ghost", onclick: () => { if (ctx.status === "playing") { st.cells.fill(0); ctx.save(st); paint(); } } }, "Clear")));

    function setTool(t) { tool = t; fillBtn.classList.toggle("on", t === 1); crossBtn.classList.toggle("on", t === 2); }

    const at = (e) => { const el = document.elementFromPoint(e.clientX, e.clientY); return el && el.classList.contains("px") ? +el.dataset.i : -1; };
    table.addEventListener("pointerdown", (e) => {
      if (ctx.status !== "playing") return;
      const i = at(e); if (i < 0) return;
      e.preventDefault();
      const t = e.button === 2 ? 2 : tool;
      painting = st.cells[i] === t ? 0 : t;
      st.cells[i] = painting;
      paint();
    });
    table.addEventListener("contextmenu", (e) => e.preventDefault());
    const move = (e) => {
      if (painting === null) return;
      const i = at(e); if (i < 0 || st.cells[i] === painting) return;
      st.cells[i] = painting;
      paint();
    };
    const up = () => {
      if (painting === null) return;
      painting = null;
      ctx.save(st);
      const filled = st.cells.map((v) => (v === 1 ? 1 : 0));
      const ok = Array.from({ length: N }, (_, k) =>
        clue(rowOf(filled, k)).join() === clue(rowOf(sol, k)).join() && clue(colOf(filled, k)).join() === clue(colOf(sol, k)).join()).every(Boolean);
      if (ok) { ctx.win("10×10 picture"); paint(); }
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    ctx.cleanup(() => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); });

    function paint() {
      cells.forEach((el, i) => { el.dataset.v = st.cells[i]; });
      const filled = st.cells.map((v) => (v === 1 ? 1 : 0));
      for (let k = 0; k < N; k++) {
        rowClues[k].classList.toggle("done", clue(rowOf(filled, k)).join() === clue(rowOf(sol, k)).join());
        colClues[k].classList.toggle("done", clue(colOf(filled, k)).join() === clue(colOf(sol, k)).join());
      }
      table.classList.toggle("finished", ctx.status === "won");
    }
    paint();
  },
};
