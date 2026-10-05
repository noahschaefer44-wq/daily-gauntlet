import { h, shuffle, randInt } from "../core.js";

const N = 6;
const adj = (i) => {
  const r = Math.floor(i / N), c = i % N, out = [];
  if (r > 0) out.push(i - N);
  if (r < N - 1) out.push(i + N);
  if (c > 0) out.push(i - 1);
  if (c < N - 1) out.push(i + 1);
  return out;
};

function hamilton(r) {
  for (;;) {
    const start = randInt(r, N * N);
    const path = [start], used = new Set(path);
    let steps = 0;
    const go = () => {
      if (path.length === N * N) return true;
      if (++steps > 20000) return false;
      const last = path[path.length - 1];
      // Warnsdorff: prefer neighbours with fewest onward moves, random tie-break.
      const opts = shuffle(r, adj(last).filter((n) => !used.has(n)))
        .map((n) => [n, adj(n).filter((m) => !used.has(m)).length])
        .sort((a, b) => a[1] - b[1]);
      for (const [n] of opts) {
        path.push(n); used.add(n);
        if (go()) return true;
        path.pop(); used.delete(n);
      }
      return false;
    };
    if (go()) return path;
  }
}

export function makePuzzle(r) {
  const path = hamilton(r);
  const k = 7 + randInt(r, 3);
  const idx = new Set([0, path.length - 1]);
  while (idx.size < k) idx.add(1 + randInt(r, path.length - 2));
  const order = [...idx].sort((a, b) => a - b);
  const nums = {};
  order.forEach((p, n) => (nums[path[p]] = n + 1));
  return { path, nums, count: order.length };
}

export default {
  id: "thread",
  name: "Thread",
  cat: "logic",
  tint: "yellow",
  blurb: "One line through every cell, numbers in order.",
  rules: `Start on 1 and drag a single line through the grid. Visit the numbers in order and fill every cell.
    Drag back over your line to undo.`,
  cover: () => {
    const p = [[0, 0], [1, 0], [2, 0], [3, 0], [3, 1], [2, 1], [1, 1], [0, 1], [0, 2], [1, 2], [2, 2], [3, 2]];
    const pt = ([c, r]) => `${50 + c * 20},${30 + r * 22}`;
    return `<rect x="38" y="17" width="84" height="70" class="t-card"/>
      <polyline points="${p.slice(0, 9).map(pt).join(" ")}" class="thread"/>
      ${[[0, "1"], [4, "2"], [11, "3"]].map(([i, n]) => `<circle cx="${50 + p[i][0] * 20}" cy="${30 + p[i][1] * 22}" r="8" class="t-ink"/><text x="${50 + p[i][0] * 20}" y="${33.5 + p[i][1] * 22}" class="tl xs inv">${n}</text>`).join("")}`;
  },
  mount(root, ctx) {
    const pz = makePuzzle(ctx.rng);
    const start = pz.path[0];
    const st = ctx.state || { line: [start] };
    let dragging = false;

    const grid = h("div", { class: "thread-grid", style: { "--n": N } });
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    svg.setAttribute("viewBox", `0 0 ${N * 100} ${N * 100}`);
    svg.classList.add("thread-svg");
    const cells = Array.from({ length: N * N }, (_, i) =>
      h("div", { class: "thcell", "data-i": i }, pz.nums[i] ? h("b", {}, pz.nums[i]) : null));
    grid.append(...cells, svg);
    const info = h("p", { class: "label center" });
    root.append(grid, info, h("div", { class: "row-c" },
      h("button", { class: "btn ghost", onclick: () => { if (ctx.status === "playing") { st.line = [start]; ctx.save(st); paint(); } } }, "Restart")));

    const cellAt = (e) => {
      const el = document.elementFromPoint(e.clientX, e.clientY);
      const c = el && el.closest(".thcell");
      return c ? +c.dataset.i : -1;
    };

    // Next number the line still has to reach.
    const nextNum = () => {
      let n = 1;
      for (const i of st.line) if (pz.nums[i] === n) n++;
      return n;
    };

    function extend(i) {
      const line = st.line, last = line[line.length - 1];
      if (i === last) return;
      if (line.length > 1 && i === line[line.length - 2]) { line.pop(); return paint(); }
      const at = line.indexOf(i);
      if (at !== -1) { line.length = at + 1; return paint(); }
      if (!adj(last).includes(i)) return;
      if (pz.nums[i] && pz.nums[i] !== nextNum()) return;
      line.push(i);
      paint();
      if (line.length === N * N && nextNum() > pz.count) ctx.win(`${N}×${N} threaded`);
    }

    grid.addEventListener("pointerdown", (e) => {
      if (ctx.status !== "playing") return;
      const i = cellAt(e);
      if (i < 0) return;
      e.preventDefault();
      dragging = true;
      if (st.line.includes(i)) st.line.length = st.line.indexOf(i) + 1;
      paint();
    });
    const move = (e) => {
      if (!dragging) return;
      const i = cellAt(e);
      if (i >= 0) extend(i);
    };
    const up = () => { if (dragging) { dragging = false; ctx.save(st); } };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
    ctx.cleanup(() => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); });

    function paint() {
      const set = new Set(st.line);
      cells.forEach((c, i) => c.classList.toggle("on", set.has(i)));
      const pts = st.line.map((i) => `${(i % N) * 100 + 50},${Math.floor(i / N) * 100 + 50}`).join(" ");
      svg.innerHTML = `<polyline points="${pts}"/>`;
      info.textContent = `${st.line.length} / ${N * N} cells`;
    }
    paint();
  },
};
