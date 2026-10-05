import { h, randInt, flash } from "../core.js";

const PEGS = 4, COLORS = 6, TRIES = 10;
const PALETTE = ["#d6402b", "#2c56c9", "#e2b13c", "#2f8a57", "#7a4fb5", "#1a1714"];

function feedback(guess, code) {
  let exact = 0, near = 0;
  const a = {}, b = {};
  guess.forEach((g, i) => {
    if (g === code[i]) exact++;
    else { a[g] = (a[g] || 0) + 1; b[code[i]] = (b[code[i]] || 0) + 1; }
  });
  for (const k in a) near += Math.min(a[k], b[k] || 0);
  return [exact, near];
}

export default {
  id: "codebreak",
  name: "Codebreak",
  cat: "logic",
  tint: "red",
  blurb: "Crack a four-colour code in ten tries.",
  rules: `A secret code of four colours (repeats allowed) is hidden. After each guess, a solid pip means
    right colour in the right place; a hollow pip means right colour, wrong place.`,
  cover: () => [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) =>
    `<circle cx="${42 + c * 20}" cy="${18 + r * 22}" r="7.5" fill="${r === 3 ? "none" : PALETTE[(r * 3 + c * 2) % 6]}" class="peg"/>`).join("")
    + (r < 3 ? [0, 1, 2, 3].map((k) => `<circle cx="${122 + (k % 2) * 7}" cy="${14 + r * 22 + Math.floor(k / 2) * 7}" r="2.6" class="${k < 3 - r ? "pip" : "pip-o"}"/>`).join("") : "")).join(""),
  mount(root, ctx) {
    const code = Array.from({ length: PEGS }, () => randInt(ctx.rng, COLORS));
    const st = ctx.state || { guesses: [] };
    let cur = [];

    const board = h("div", { class: "code-board" });
    const palette = h("div", { class: "row-c" }, PALETTE.map((c, k) =>
      h("button", { class: "swatch", style: { background: c }, "aria-label": `Colour ${k + 1}`, onclick: () => add(k) })));
    root.append(board, palette, h("div", { class: "row-c" },
      h("button", { class: "btn ghost", onclick: () => { cur.pop(); paint(); } }, "Delete"),
      h("button", { class: "btn", onclick: submit }, "Check")));

    const onDown = (e) => {
      if (/^[1-6]$/.test(e.key)) add(+e.key - 1);
      else if (e.key === "Backspace") { cur.pop(); paint(); }
      else if (e.key === "Enter") submit();
    };
    document.addEventListener("keydown", onDown);
    ctx.cleanup(() => document.removeEventListener("keydown", onDown));

    function add(k) { if (ctx.status === "playing" && cur.length < PEGS) { cur.push(k); paint(); } }
    function submit() {
      if (ctx.status !== "playing") return;
      if (cur.length < PEGS) return flash("Four colours");
      st.guesses.push(cur);
      cur = [];
      ctx.save(st);
      paint();
      const fb = st.guesses.map((g) => feedback(g, code));
      const share = fb.map(([e, n]) => "●".repeat(e) + "○".repeat(n) + "·".repeat(PEGS - e - n)).join("\n");
      if (fb[fb.length - 1][0] === PEGS) ctx.win(`${st.guesses.length}/${TRIES}\n${share}`);
      else if (st.guesses.length === TRIES) { ctx.lose(`X/${TRIES}\n${share}`); paint(); }
    }
    function paint() {
      board.innerHTML = "";
      for (let r = 0; r < TRIES; r++) {
        const g = st.guesses[r] || (r === st.guesses.length ? cur : []);
        const fb = st.guesses[r] ? feedback(st.guesses[r], code) : null;
        board.append(h("div", { class: "code-row" + (r === st.guesses.length && ctx.status === "playing" ? " live" : "") },
          h("span", { class: "n" }, r + 1),
          Array.from({ length: PEGS }, (_, i) => h("i", { class: "peg", style: g[i] != null ? { background: PALETTE[g[i]], borderColor: PALETTE[g[i]] } : null })),
          h("span", { class: "pips" }, fb ? Array.from({ length: PEGS }, (_, i) => h("b", { class: i < fb[0] ? "x" : i < fb[0] + fb[1] ? "n" : "" })) : null)));
      }
      if (ctx.status === "lost") board.append(h("div", { class: "code-row live" }, h("span", { class: "n" }, "="),
        code.map((c) => h("i", { class: "peg", style: { background: PALETTE[c], borderColor: PALETTE[c] } }))));
    }
    paint();
  },
};
