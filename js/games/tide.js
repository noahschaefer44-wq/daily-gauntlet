import { h, shuffle, randInt } from "../core.js";

const N = 6;
// Cell values: 0 empty, 1 sun, 2 moon. Links: [a, b, "="|"x"].

function okLine(vals) {
  const s = vals.filter((v) => v === 1).length, m = vals.filter((v) => v === 2).length;
  if (s > N / 2 || m > N / 2) return false;
  for (let i = 0; i + 2 < N; i++) if (vals[i] && vals[i] === vals[i + 1] && vals[i] === vals[i + 2]) return false;
  return true;
}
const row = (g, r) => g.slice(r * N, r * N + N);
const col = (g, c) => Array.from({ length: N }, (_, r) => g[r * N + c]);

function valid(g, links, i) {
  const r = Math.floor(i / N), c = i % N;
  if (!okLine(row(g, r)) || !okLine(col(g, c))) return false;
  for (const [a, b, t] of links) {
    if (!g[a] || !g[b]) continue;
    if (t === "=" ? g[a] !== g[b] : g[a] === g[b]) return false;
  }
  return true;
}

function solveCount(g, links, limit, r) {
  const i = g.indexOf(0);
  if (i === -1) return 1;
  let total = 0;
  for (const v of r ? shuffle(r, [1, 2]) : [1, 2]) {
    g[i] = v;
    if (valid(g, links, i)) total += solveCount(g, links, limit - total, r);
    if (r && total) return total; // filling mode: stop at first
    g[i] = 0;
    if (total >= limit) break;
  }
  g[i] = 0;
  return total;
}

export function makePuzzle(r) {
  const sol = Array(N * N).fill(0);
  solveCount(sol, [], 1, r);
  // Random links between neighbours, true to the solution.
  const pairs = [];
  for (let i = 0; i < N * N; i++) {
    if (i % N < N - 1) pairs.push([i, i + 1]);
    if (i < N * (N - 1)) pairs.push([i, i + N]);
  }
  const links = shuffle(r, pairs).slice(0, 5 + randInt(r, 4)).map(([a, b]) => [a, b, sol[a] === sol[b] ? "=" : "x"]);
  const puz = sol.slice();
  for (const i of shuffle(r, [...puz.keys()])) {
    const keep = puz[i];
    puz[i] = 0;
    if (solveCount(puz.slice(), links, 2) !== 1) puz[i] = keep;
  }
  return { sol, puz, links };
}

const SUN = `<svg viewBox="0 0 24 24" class="sun"><circle cx="12" cy="12" r="7"/></svg>`;
const MOON = `<svg viewBox="0 0 24 24" class="moon"><path d="M15.5 3.5a8.5 8.5 0 1 0 5 13.5 7 7 0 0 1-5-13.5z"/></svg>`;

export default {
  id: "tide",
  name: "Tide",
  cat: "logic",
  tint: "blue",
  blurb: "Balance suns and moons on a 6×6 grid.",
  rules: `Fill the grid so every row and column holds three suns and three moons.
    No more than two of the same may sit next to each other. Cells joined by <b>=</b> are equal,
    cells joined by <b>×</b> are opposite.`,
  cover: () => {
    let s = "";
    const v = [1, 2, 2, 1, 2, 1, 1, 2, 1, 2, 2, 1, 2, 1, 1, 2];
    v.forEach((x, i) => {
      const cx = 44 + (i % 4) * 24, cy = 16 + Math.floor(i / 4) * 24;
      s += `<rect x="${cx - 11}" y="${cy - 11}" width="22" height="22" class="t-card"/>`;
      if ((i * 7) % 5 < 3) s += x === 1 ? `<circle cx="${cx}" cy="${cy}" r="6" class="sun-c"/>`
        : `<path transform="translate(${cx - 12},${cy - 12})" d="M15.5 3.5a8.5 8.5 0 1 0 5 13.5 7 7 0 0 1-5-13.5z" class="moon-c"/>`;
    });
    return s + `<text x="68" y="31" class="tl xs">=</text><text x="92" y="79" class="tl xs">×</text>`;
  },
  mount(root, ctx) {
    const { puz, links } = makePuzzle(ctx.rng);
    const st = ctx.state || { vals: puz.slice() };
    const grid = h("div", { class: "tide", style: { "--n": N } });
    const cells = puz.map((g, i) => {
      const el = h("button", { class: "tcellb" + (g ? " given" : ""), onclick: () => tap(i) });
      grid.append(el);
      return el;
    });
    for (const [a, b, t] of links) {
      const horiz = b === a + 1;
      const r = Math.floor(a / N), c = a % N;
      grid.append(h("span", {
        class: "link", style: {
          left: `calc(${(c + (horiz ? 1 : 0.5)) / N * 100}%)`,
          top: `calc(${(r + (horiz ? 0.5 : 1)) / N * 100}%)`,
        },
      }, t === "=" ? "=" : "×"));
    }
    const msg = h("p", { class: "label center" }, " ");
    root.append(grid, msg, h("div", { class: "row-c" },
      h("button", { class: "btn ghost", onclick: () => { if (ctx.status === "playing") { st.vals = puz.slice(); ctx.save(st); paint(); } } }, "Clear")));

    function tap(i) {
      if (ctx.status !== "playing" || puz[i]) return;
      st.vals[i] = (st.vals[i] + 1) % 3;
      ctx.save(st);
      paint();
      if (st.vals.every(Boolean) && st.vals.every((_, k) => valid(st.vals, links, k))) ctx.win("6×6 balanced");
    }

    function paint() {
      const bad = new Set();
      for (let k = 0; k < N; k++) {
        if (!okLine(row(st.vals, k))) for (let c = 0; c < N; c++) bad.add(k * N + c);
        if (!okLine(col(st.vals, k))) for (let r = 0; r < N; r++) bad.add(r * N + k);
      }
      for (const [a, b, t] of links) if (st.vals[a] && st.vals[b] && (t === "=" ? st.vals[a] !== st.vals[b] : st.vals[a] === st.vals[b])) { bad.add(a); bad.add(b); }
      cells.forEach((el, i) => {
        el.innerHTML = st.vals[i] === 1 ? SUN : st.vals[i] === 2 ? MOON : "";
        el.classList.toggle("bad", bad.has(i));
      });
      msg.textContent = bad.size ? "Something breaks a rule." : " ";
    }
    paint();
  },
};
