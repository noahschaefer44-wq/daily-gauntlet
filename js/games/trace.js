import { h, shuffle, shake, flash } from "../core.js";
import { COMMON } from "../data/words.js";

// Classic 16-dice distribution keeps boards playable.
const DICE = ["AAEEGN", "ABBJOO", "ACHOPS", "AFFKPS", "AOOTTW", "CIMOTU", "DEILRX", "DELRVY",
  "DISTTY", "EEGHNW", "EEINSU", "EHRTVW", "EIOSST", "ELRTTY", "HIMNUQ", "HLNNRZ"];
const N = 4;
const GOAL = 0.5;

const nbrs = (i) => {
  const r = Math.floor(i / N), c = i % N, out = [];
  for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
    if (!dr && !dc) continue;
    const rr = r + dr, cc = c + dc;
    if (rr >= 0 && rr < N && cc >= 0 && cc < N) out.push(rr * N + cc);
  }
  return out;
};

function solve(board, dict) {
  const trie = {};
  for (const w of dict) { let t = trie; for (const ch of w) t = t[ch] ||= {}; t.$ = w; }
  const found = new Set();
  const go = (i, t, used) => {
    const ch = board[i];
    let node = t[ch];
    if (ch === "q" && node) node = node.u; // Q die reads as "qu"
    if (!node) return;
    if (node.$ && node.$.length >= 4) found.add(node.$);
    used.add(i);
    for (const n of nbrs(i)) if (!used.has(n)) go(n, node, used);
    used.delete(i);
  };
  for (let i = 0; i < N * N; i++) go(i, trie, new Set());
  return [...found];
}

export function makePuzzle(r) {
  const dict = COMMON.filter((w) => w.length >= 4 && w.length <= 9);
  for (let k = 0; k < 200; k++) {
    const board = shuffle(r, DICE).map((d) => d[Math.floor(r() * 6)].toLowerCase());
    const words = solve(board, dict);
    if (words.length >= 25 && words.length <= 90) return { board, words };
  }
  throw new Error("no trace board");
}

export default {
  id: "trace",
  name: "Trace",
  cat: "words",
  tint: "blue",
  blurb: "Drag through a 4×4 letter grid to spell words.",
  rules: `Drag across neighbouring letters (diagonals count) to spell words of four or more letters.
    Each letter can be used once per word. Find half of all hidden words to clear the day.`,
  cover: () => {
    const L = "TRACEWINDSOLGHUP";
    const path = [0, 1, 2, 3, 6];
    let s = `<polyline points="${path.map((i) => `${34 + (i % 4) * 31},${15 + Math.floor(i / 4) * 30}`).join(" ")}" class="trail"/>`;
    for (let i = 0; i < 16; i++) {
      const x = 34 + (i % 4) * 31, y = 15 + Math.floor(i / 4) * 30;
      s += `<circle cx="${x}" cy="${y}" r="12" class="${path.includes(i) ? "t-ink" : "t-card"}"/>
        <text x="${x}" y="${y + 4.5}" class="tl sm ${path.includes(i) ? "inv" : ""}">${L[i]}</text>`;
    }
    return s;
  },
  mount(root, ctx) {
    const pz = makePuzzle(ctx.rng);
    const goal = Math.ceil(pz.words.length * GOAL);
    const st = ctx.state || { found: [] };
    let path = [];
    let dragging = false;

    const word = h("div", { class: "trace-word" });
    const prog = h("div", { class: "label center" });
    const grid = h("div", { class: "trace" });
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", "0 0 400 400");
    svg.classList.add("trace-svg");
    const cells = pz.board.map((ch, i) => h("div", { class: "tcell", "data-i": i }, h("span", {}, ch === "q" ? "Qu" : ch.toUpperCase())));
    grid.append(svg, ...cells);
    const foundEl = h("div", { class: "comb-found" });
    root.append(prog, word, grid, foundEl);

    const text = () => path.map((i) => (pz.board[i] === "q" ? "qu" : pz.board[i])).join("");

    function draw() {
      cells.forEach((c, i) => c.classList.toggle("on", path.includes(i)));
      svg.innerHTML = path.length > 1
        ? `<polyline points="${path.map((i) => `${(i % N) * 100 + 50},${Math.floor(i / N) * 100 + 50}`).join(" ")}"/>` : "";
      word.textContent = text().toUpperCase() || " ";
    }

    function paint() {
      prog.textContent = `${st.found.length} of ${pz.words.length} words  ·  goal ${goal}`;
      foundEl.innerHTML = "";
      const all = ctx.status === "lost" ? pz.words : st.found;
      foundEl.append(h("div", { class: "words" }, [...all].sort().map((w) => h("span", { class: st.found.includes(w) ? "" : "miss" }, w))));
      draw();
    }

    function cellAt(e) {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const c = el && el.closest(".tcell");
      if (!c) return -1;
      // Only count hits near the centre so diagonal drags are easy.
      const b = c.getBoundingClientRect();
      const dx = e.clientX - (b.left + b.width / 2), dy = e.clientY - (b.top + b.height / 2);
      return Math.hypot(dx, dy) < b.width * 0.42 ? +c.dataset.i : -1;
    }

    grid.addEventListener("pointerdown", (e) => {
      const i = cellAt(e);
      if (i < 0) return;
      e.preventDefault();
      dragging = true;
      path = [i];
      draw();
    });
    const move = (e) => {
      if (!dragging) return;
      const i = cellAt(e);
      if (i < 0) return;
      const last = path[path.length - 1];
      if (i === path[path.length - 2]) { path.pop(); draw(); return; }
      if (path.includes(i) || !nbrs(last).includes(i)) return;
      path.push(i);
      draw();
    };
    const up = () => {
      if (!dragging) return;
      dragging = false;
      const w = text();
      path = [];
      if (w.length >= 4) submit(w);
      draw();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    ctx.cleanup(() => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); });

    function submit(w) {
      if (st.found.includes(w)) return flash("Already found");
      if (!pz.words.includes(w)) { shake(word); return flash("Not in word list"); }
      st.found.push(w);
      flash(`+ ${w.toUpperCase()}`);
      ctx.save(st);
      paint();
      if (ctx.status === "playing" && st.found.length >= goal) ctx.win(`${st.found.length}/${pz.words.length} words`, null, true);
      else if (ctx.status === "won") ctx.update(`${st.found.length}/${pz.words.length} words`);
    }

    paint();
  },
};
