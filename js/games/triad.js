import { h, shuffle, flash, shake } from "../core.js";

// Card = [count, shape, colour, fill], each 0..2.
const isTriad = (a, b, c) => [0, 1, 2, 3].every((k) => (a[k] + b[k] + c[k]) % 3 === 0);

function allTriads(cards) {
  const out = [];
  for (let i = 0; i < cards.length; i++) for (let j = i + 1; j < cards.length; j++) for (let k = j + 1; k < cards.length; k++)
    if (isTriad(cards[i], cards[j], cards[k])) out.push([i, j, k].join());
  return out;
}

export function makePuzzle(r) {
  const deck = [];
  for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) for (let c = 0; c < 3; c++) for (let d = 0; d < 3; d++) deck.push([a, b, c, d]);
  for (;;) {
    const cards = shuffle(r, deck).slice(0, 12);
    const sets = allTriads(cards);
    if (sets.length === 6) return { cards, sets };
  }
}

const COLORS = ["var(--red)", "var(--blue)", "var(--green)"];
function shapeSvg([count, shape, color, fill], id) {
  const col = COLORS[color];
  const pat = `<pattern id="hatch${id}" width="4" height="4" patternUnits="userSpaceOnUse"><rect width="4" height="1.6" fill="${col}"/></pattern>`;
  const f = fill === 0 ? col : fill === 1 ? `url(#hatch${id})` : "none";
  const one = (x) => shape === 0 ? `<circle cx="${x}" cy="30" r="13"/>`
    : shape === 1 ? `<path d="M${x} 15 L${x + 15} 43 L${x - 15} 43 Z"/>`
    : `<path d="M${x} 14 L${x + 13} 30 L${x} 46 L${x - 13} 30 Z"/>`;
  const xs = count === 0 ? [60] : count === 1 ? [43, 77] : [26, 60, 94];
  return `<svg viewBox="0 0 120 60"><defs>${pat}</defs><g fill="${f}" stroke="${col}" stroke-width="2.6" stroke-linejoin="round">${xs.map(one).join("")}</g></svg>`;
}

export default {
  id: "triad",
  name: "Triad",
  cat: "logic",
  tint: "green",
  blurb: "Find all six triads hiding in twelve cards.",
  rules: `A triad is three cards where each feature (count, shape, colour, shading) is either
    all the same or all different across the three. Today's twelve cards hide exactly six triads.`,
  cover: () => [0, 1, 2].map((k) => {
    const x = 18 + k * 44;
    return `<rect x="${x}" y="22" width="36" height="58" rx="4" class="t-card"/>
      ${[0, 1, 2].slice(0, k + 1).map((n) => {
        const cy = 51 + (n - k / 2) * 15;
        return k === 0 ? `<circle cx="${x + 18}" cy="${cy}" r="6" class="sh-red"/>`
          : k === 1 ? `<path d="M${x + 18} ${cy - 6} L${x + 25} ${cy + 6} L${x + 11} ${cy + 6} Z" class="sh-blue"/>`
          : `<path d="M${x + 18} ${cy - 6} L${x + 25} ${cy} L${x + 18} ${cy + 6} L${x + 11} ${cy} Z" class="sh-green"/>`;
      }).join("")}`;
  }).join(""),
  mount(root, ctx) {
    const { cards, sets } = makePuzzle(ctx.rng);
    const st = ctx.state || { found: [], wrong: 0 };
    let sel = [];
    const grid = h("div", { class: "triad" });
    const els = cards.map((c, i) => {
      const b = h("button", { class: "tcard", html: shapeSvg(c, i), onclick: () => tap(i) });
      grid.append(b);
      return b;
    });
    const foundEl = h("div", { class: "triad-found" });
    root.append(h("p", { class: "label center", id: "triadInfo" }), grid, foundEl);

    function tap(i) {
      if (ctx.status !== "playing") return;
      sel = sel.includes(i) ? sel.filter((x) => x !== i) : [...sel, i];
      if (sel.length === 3) {
        const key = [...sel].sort((a, b) => a - b).join();
        if (st.found.includes(key)) flash("Already found");
        else if (sets.includes(key)) { st.found.push(key); flash("Triad!"); }
        else { st.wrong++; shake(grid); flash("Not a triad"); }
        sel = [];
        ctx.save(st);
        if (st.found.length === sets.length) ctx.win(`6/6 triads, ${st.wrong} miss${st.wrong === 1 ? "" : "es"}`);
      }
      paint();
    }
    function paint() {
      els.forEach((b, i) => b.classList.toggle("on", sel.includes(i)));
      root.querySelector("#triadInfo").textContent = `${st.found.length} of ${sets.length} found`;
      foundEl.innerHTML = "";
      st.found.forEach((key) => foundEl.append(h("div", { class: "trow" },
        key.split(",").map((i) => h("div", { class: "mini", html: shapeSvg(cards[i], `f${key}${i}`.replace(/,/g, "")) })))));
    }
    paint();
  },
};
