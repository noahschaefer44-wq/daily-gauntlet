import { h, shuffle } from "../core.js";

// Generic sudoku for size 6 (2x3 boxes) or 9 (3x3 boxes).
export function spec(n) {
  const bh = n === 6 ? 2 : 3, bw = 3;
  const peers = [];
  for (let i = 0; i < n * n; i++) {
    const r = Math.floor(i / n), c = i % n, set = new Set();
    for (let k = 0; k < n; k++) { set.add(r * n + k); set.add(k * n + c); }
    const br = r - (r % bh), bc = c - (c % bw);
    for (let y = 0; y < bh; y++) for (let x = 0; x < bw; x++) set.add((br + y) * n + bc + x);
    set.delete(i);
    peers.push([...set]);
  }
  return { n, bh, bw, peers };
}

function count(grid, S, limit) {
  let best = -1, bestOpts = null;
  for (let i = 0; i < grid.length; i++) {
    if (grid[i]) continue;
    const used = new Set(S.peers[i].map((p) => grid[p]));
    const opts = [];
    for (let v = 1; v <= S.n; v++) if (!used.has(v)) opts.push(v);
    if (!opts.length) return 0;
    if (!bestOpts || opts.length < bestOpts.length) { best = i; bestOpts = opts; if (opts.length === 1) break; }
  }
  if (best === -1) return 1;
  let total = 0;
  for (const v of bestOpts) {
    grid[best] = v;
    total += count(grid, S, limit - total);
    grid[best] = 0;
    if (total >= limit) break;
  }
  return total;
}

function fill(grid, S, r, i = 0) {
  if (i === grid.length) return true;
  if (grid[i]) return fill(grid, S, r, i + 1);
  for (const v of shuffle(r, Array.from({ length: S.n }, (_, k) => k + 1))) {
    if (S.peers[i].some((p) => grid[p] === v)) continue;
    grid[i] = v;
    if (fill(grid, S, r, i + 1)) return true;
  }
  grid[i] = 0;
  return false;
}

export function makeSudoku(r, n, targetClues) {
  const S = spec(n);
  const sol = Array(n * n).fill(0);
  fill(sol, S, r);
  const puz = sol.slice();
  let clues = n * n;
  for (const i of shuffle(r, [...puz.keys()])) {
    if (clues <= targetClues) break;
    const keep = puz[i];
    puz[i] = 0;
    if (count(puz.slice(), S, 2) !== 1) puz[i] = keep;
    else clues--;
  }
  return { S, sol, puz };
}

export function sudokuGame(root, ctx, n, clues) {
  const { S, sol, puz } = makeSudoku(ctx.rng, n, clues);
  const st = ctx.state || { vals: puz.slice(), notes: {}, t: 0 };
  let selected = puz.findIndex((v) => !v);
  let noteMode = false;

  const grid = h("div", { class: `sudoku s${n}`, style: { "--n": n } });
  const cells = puz.map((given, i) => {
    const r = Math.floor(i / n), c = i % n;
    const cls = ["scell", given ? "given" : "",
      (c + 1) % S.bw === 0 && c < n - 1 ? "br" : "", (r + 1) % S.bh === 0 && r < n - 1 ? "bb" : ""].join(" ");
    const el = h("button", { class: cls, onclick: () => { selected = i; paint(); } });
    grid.append(el);
    return el;
  });
  const pad = h("div", { class: "numpad" },
    Array.from({ length: n }, (_, k) => h("button", { class: "key", onclick: () => put(k + 1) }, k + 1)),
    h("button", { class: "key wide", onclick: () => put(0) }, "Erase"),
  );
  const noteBtn = h("button", { class: "btn ghost", onclick: () => { noteMode = !noteMode; noteBtn.classList.toggle("on", noteMode); } }, "Pencil");
  root.append(grid, pad, h("div", { class: "row-c" }, noteBtn));

  const onDown = (e) => {
    if (ctx.status !== "playing") return;
    const k = e.key;
    if (/^[1-9]$/.test(k) && +k <= n) put(+k);
    else if (k === "Backspace" || k === "Delete" || k === "0") put(0);
    else if (k.startsWith("Arrow")) {
      const d = { ArrowUp: -n, ArrowDown: n, ArrowLeft: -1, ArrowRight: 1 }[k];
      selected = (selected + d + n * n) % (n * n);
      e.preventDefault();
      paint();
    } else if (k === "p" || k === "n") noteBtn.click();
  };
  document.addEventListener("keydown", onDown);
  ctx.cleanup(() => document.removeEventListener("keydown", onDown));

  function put(v) {
    if (ctx.status !== "playing" || selected < 0 || puz[selected]) return;
    if (noteMode && v) {
      const set = new Set(st.notes[selected] || []);
      set.has(v) ? set.delete(v) : set.add(v);
      st.notes[selected] = [...set];
      st.vals[selected] = 0;
    } else {
      st.vals[selected] = v;
      delete st.notes[selected];
      if (v) for (const p of S.peers[selected]) if (st.notes[p]) st.notes[p] = st.notes[p].filter((x) => x !== v);
    }
    ctx.save(st);
    paint();
    if (st.vals.every((x, i) => x === sol[i])) ctx.win(`${n}×${n} solved`);
  }

  function paint() {
    const selVal = st.vals[selected];
    cells.forEach((el, i) => {
      const v = st.vals[i];
      const clash = v && S.peers[i].some((p) => st.vals[p] === v);
      el.className = el.className.replace(/ (sel|peer|same|clash)/g, "");
      if (i === selected) el.className += " sel";
      else if (S.peers[selected]?.includes(i)) el.className += " peer";
      if (v && v === selVal && i !== selected) el.className += " same";
      if (clash && !puz[i]) el.className += " clash";
      if (v) el.textContent = v;
      else if (st.notes[i]?.length) {
        el.textContent = "";
        el.append(h("span", { class: "notes", style: { "--n": n } },
          Array.from({ length: n }, (_, k) => h("i", {}, st.notes[i].includes(k + 1) ? k + 1 : ""))));
      } else el.textContent = "";
    });
  }
  paint();
}
