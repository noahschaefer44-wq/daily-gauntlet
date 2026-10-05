import { h, shuffle, randInt } from "../core.js";

const N = 8;
const touches = (a, b) => Math.abs(Math.floor(a / N) - Math.floor(b / N)) <= 1 && Math.abs((a % N) - (b % N)) <= 1;

function placeCrowns(r) {
  const cols = [];
  const go = (row) => {
    if (row === N) return true;
    for (const c of shuffle(r, [...Array(N).keys()])) {
      if (cols.includes(c)) continue;
      if (row > 0 && Math.abs(cols[row - 1] - c) <= 1) continue;
      cols.push(c);
      if (go(row + 1)) return true;
      cols.pop();
    }
    return false;
  };
  go(0);
  return cols.map((c, row) => row * N + c);
}

function growRegions(r, seeds) {
  const reg = Array(N * N).fill(-1);
  seeds.forEach((s, k) => (reg[s] = k));
  let left = N * N - N;
  while (left) {
    const i = randInt(r, N * N);
    if (reg[i] !== -1) continue;
    const row = Math.floor(i / N), col = i % N;
    const adj = [[row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1]]
      .filter(([y, x]) => y >= 0 && y < N && x >= 0 && x < N).map(([y, x]) => reg[y * N + x]).filter((k) => k !== -1);
    if (!adj.length) continue;
    reg[i] = adj[randInt(r, adj.length)];
    left--;
  }
  return reg;
}

export const countSolutions = (reg, limit = 2) => solutions(reg, limit).length;

function solutions(reg, limit) {
  const found = [];
  const cols = [], usedR = new Set();
  const go = (row) => {
    if (found.length >= limit) return;
    if (row === N) { found.push(cols.map((c, r) => r * N + c)); return; }
    for (let c = 0; c < N; c++) {
      const i = row * N + c;
      if (cols.some((cc) => cc === c) || usedR.has(reg[i])) continue;
      if (row > 0 && Math.abs(cols[row - 1] - c) <= 1) continue;
      cols.push(c); usedR.add(reg[i]);
      go(row + 1);
      cols.pop(); usedR.delete(reg[i]);
    }
  };
  go(0);
  return found;
}

const orth = (i) => {
  const r = Math.floor(i / N), c = i % N, out = [];
  if (r > 0) out.push(i - N);
  if (r < N - 1) out.push(i + N);
  if (c > 0) out.push(i - 1);
  if (c < N - 1) out.push(i + 1);
  return out;
};

function connected(reg, k) {
  const cells = reg.map((g, i) => (g === k ? i : -1)).filter((i) => i >= 0);
  if (!cells.length) return false;
  const seen = new Set([cells[0]]);
  const q = [cells[0]];
  while (q.length) for (const n of orth(q.shift())) if (reg[n] === k && !seen.has(n)) { seen.add(n); q.push(n); }
  return seen.size === cells.length;
}

// Grow random regions, then repair: move cells of a rival solution into neighbouring
// regions until only the intended solution is left. The intended one always stays valid.
export function makePuzzle(r) {
  let best = null;
  for (let k = 0; k < 60; k++) {
    const crowns = placeCrowns(r);
    const reg = growRegions(r, crowns);
    const mine = new Set(crowns);
    for (let step = 0; step < 300; step++) {
      const sols = solutions(reg, 2);
      if (sols.length === 1) return { reg, crowns };
      const rival = sols.find((s) => s.some((i) => !mine.has(i)));
      const movable = shuffle(r, rival.filter((i) => !mine.has(i)));
      let moved = false;
      for (const cell of movable) {
        const from = reg[cell];
        for (const n of shuffle(r, orth(cell))) {
          if (reg[n] === from) continue;
          reg[cell] = reg[n];
          if (connected(reg, from)) { moved = true; break; }
          reg[cell] = from;
        }
        if (moved) break;
      }
      if (!moved) break;
    }
    best = { reg, crowns };
  }
  return best;
}

const REGION_COLORS = ["#e9a28a", "#f2d27a", "#a9c99b", "#9fbfe0", "#c7b0de", "#f0b6c8", "#cfc6b5", "#8fd0c4", "#e7c09a", "#b9d36f"];

export default {
  id: "crowns",
  name: "Crowns",
  cat: "logic",
  tint: "red",
  blurb: "One crown per row, column and colour.",
  rules: `Place one crown in every row, every column and every coloured region.
    Two crowns may never touch, not even diagonally. Tap once to mark a cell with a dot, twice for a crown.`,
  cover: () => {
    const reg = [0, 0, 1, 1, 1, 0, 2, 2, 1, 3, 2, 2, 3, 3, 3, 2, 3, 3, 4, 4, 3, 4, 4, 4, 4];
    const cols = ["#e9a28a", "#f2d27a", "#a9c99b", "#9fbfe0", "#c7b0de"];
    let s = "";
    reg.forEach((g, i) => {
      const x = 35 + (i % 5) * 18, y = 15 + Math.floor(i / 5) * 18;
      s += `<rect x="${x}" y="${y}" width="18" height="18" fill="${cols[g]}" class="reg"/>`;
    });
    [6, 23].forEach((i) => {
      const x = 44 + (i % 5) * 18, y = 24 + Math.floor(i / 5) * 18;
      s += `<path d="M${x - 6} ${y + 4} L${x - 6} ${y - 4} L${x - 3} ${y} L${x} ${y - 5} L${x + 3} ${y} L${x + 6} ${y - 4} L${x + 6} ${y + 4} Z" class="crown"/>`;
    });
    return s + `<rect x="35" y="15" width="90" height="90" class="frame"/>`;
  },
  mount(root, ctx) {
    const { reg } = makePuzzle(ctx.rng);
    const st = ctx.state || { marks: Array(N * N).fill(0) }; // 0 empty, 1 dot, 2 crown
    const grid = h("div", { class: "crowns", style: { "--n": N } });
    const cells = reg.map((g, i) => {
      const row = Math.floor(i / N), col = i % N;
      const b = [];
      if (row === 0 || reg[i - N] !== g) b.push("bt");
      if (col === 0 || reg[i - 1] !== g) b.push("bl");
      if (col === N - 1 || reg[i + 1] !== g) b.push("brr");
      if (row === N - 1 || reg[i + N] !== g) b.push("bbb");
      const el = h("button", { class: "ccell " + b.join(" "), style: { background: REGION_COLORS[g] }, onclick: () => tap(i) });
      grid.append(el);
      return el;
    });
    const clear = h("button", { class: "btn ghost", onclick: () => { if (ctx.status === "playing") { st.marks.fill(0); ctx.save(st); paint(); } } }, "Clear");
    root.append(grid, h("div", { class: "row-c" }, clear));

    const crownSvg = `<svg viewBox="0 0 24 24"><path d="M3 18 L3 7 L8 12 L12 5 L16 12 L21 7 L21 18 Z"/></svg>`;

    function conflicts() {
      const bad = new Set();
      const cr = st.marks.map((m, i) => (m === 2 ? i : -1)).filter((i) => i >= 0);
      for (const a of cr) for (const b of cr) {
        if (a >= b) continue;
        const same = Math.floor(a / N) === Math.floor(b / N) || a % N === b % N || reg[a] === reg[b] || touches(a, b);
        if (same) { bad.add(a); bad.add(b); }
      }
      return { cr, bad };
    }

    function tap(i) {
      if (ctx.status !== "playing") return;
      st.marks[i] = (st.marks[i] + 1) % 3;
      ctx.save(st);
      paint();
      const { cr, bad } = conflicts();
      if (cr.length === N && !bad.size) ctx.win(`${N}×${N} crowns placed`);
    }

    function paint() {
      const { bad } = conflicts();
      cells.forEach((el, i) => {
        const m = st.marks[i];
        el.innerHTML = m === 2 ? crownSvg : m === 1 ? "<i class='dot'></i>" : "";
        el.classList.toggle("bad", bad.has(i));
      });
    }
    paint();
  },
};
