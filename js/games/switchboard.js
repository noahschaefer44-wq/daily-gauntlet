import { h, shuffle, randInt } from "../core.js";

const N = 5;
const press = (g, i) => {
  const r = Math.floor(i / N), c = i % N;
  for (const [y, x] of [[r, c], [r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]])
    if (y >= 0 && y < N && x >= 0 && x < N) g[y * N + x] ^= 1;
};

export function makePuzzle(r) {
  const moves = shuffle(r, [...Array(N * N).keys()]).slice(0, 6 + randInt(r, 4));
  const g = Array(N * N).fill(0);
  moves.forEach((i) => press(g, i));
  return { start: g, par: moves.length };
}

export default {
  id: "switchboard",
  name: "Switchboard",
  cat: "logic",
  tint: "yellow",
  blurb: "Every switch flips its neighbours. Kill all lights.",
  rules: `Pressing a lamp toggles it and the four lamps next to it. Turn every lamp off.
    Par is the number of presses that built the board; matching it is a perfect run.`,
  cover: () => {
    const on = [1, 0, 1, 1, 0, 0, 1, 1, 0, 1, 1, 1, 0, 0, 1, 0];
    return on.map((v, i) => `<rect x="${44 + (i % 4) * 19}" y="${12 + Math.floor(i / 4) * 19}" width="16" height="16" rx="3" class="${v ? "t-lamp" : "t-card"}"/>`).join("")
      + `<rect x="40" y="8" width="80" height="80" rx="5" class="frame"/>`;
  },
  mount(root, ctx) {
    const { start, par } = makePuzzle(ctx.rng);
    const st = ctx.state || { g: start.slice(), moves: 0 };
    const grid = h("div", { class: "switch", style: { "--n": N } });
    const cells = st.g.map((_, i) => {
      const b = h("button", { class: "lamp", onclick: () => tap(i), "aria-label": `Lamp ${i + 1}` });
      grid.append(b);
      return b;
    });
    const info = h("p", { class: "label center" });
    root.append(grid, info, h("div", { class: "row-c" },
      h("button", { class: "btn ghost", onclick: () => { if (ctx.status === "playing") { st.g = start.slice(); st.moves = 0; ctx.save(st); paint(); } } }, "Reset")));

    function tap(i) {
      if (ctx.status !== "playing") return;
      press(st.g, i);
      st.moves++;
      ctx.save(st);
      paint();
      if (st.g.every((v) => !v)) ctx.win(`${st.moves} presses (par ${par})`, st.moves <= par ? "Perfect run." : null);
    }
    function paint() {
      cells.forEach((b, i) => b.classList.toggle("on", !!st.g[i]));
      info.textContent = `${st.moves} presses  ·  par ${par}  ·  ${st.g.filter(Boolean).length} lit`;
    }
    paint();
  },
};
