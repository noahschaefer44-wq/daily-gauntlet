import { h, shuffle, randInt } from "../core.js";
import { FACTS } from "../data/facts.js";

const ROUNDS = 5;
const SPAN = 7; // orders of magnitude on the slider

export function fmt(v) {
  const a = Math.abs(v);
  if (a >= 1e15) return v.toExponential(1).replace("e+", " × 10^");
  const units = [[1e12, " trillion"], [1e9, " billion"], [1e6, " million"]];
  for (const [u, name] of units) if (a >= u) return +(v / u).toPrecision(3) + name;
  if (a >= 1000) return Math.round(v).toLocaleString("en-US");
  if (a >= 1) return String(+v.toPrecision(3));
  return String(+v.toPrecision(2));
}

export const points = (guess, actual) => Math.round(100 * Math.max(0, 1 - Math.abs(Math.log10(guess / actual)) / 2));

export default {
  id: "scale",
  name: "Scale",
  cat: "numbers",
  tint: "yellow",
  blurb: "Five questions. Get the order of magnitude right.",
  rules: `Each question asks for a real-world quantity. Slide to your estimate on a logarithmic scale.
    Exact answers score 100; you lose 50 points per factor of ten you are off.`,
  cover: () => `<line x1="14" y1="64" x2="146" y2="64" class="ray"/>
    ${[0, 1, 2, 3, 4, 5, 6].map((i) => `<line x1="${14 + i * 22}" y1="58" x2="${14 + i * 22}" y2="70" class="ray"/>
      <text x="${14 + i * 22}" y="86" class="tl xs">10${["⁰", "¹", "²", "³", "⁴", "⁵", "⁶"][i]}</text>`).join("")}
    <path d="M95 64 L89 44 L101 44 Z" class="t-ink"/><circle cx="95" cy="38" r="9" class="sun-c"/>`,
  mount(root, ctx) {
    const qs = shuffle(ctx.rng, FACTS).slice(0, ROUNDS).map(([q, v, unit]) => {
      const e = Math.log10(v);
      const lo = Math.floor(e) - 1 - randInt(ctx.rng, SPAN - 2);
      return { q, v, unit, lo, hi: lo + SPAN };
    });
    const st = ctx.state || { answers: [] };
    const body = h("div", { class: "scale" });
    root.append(body);

    function paint() {
      body.innerHTML = "";
      const k = st.answers.length;
      const total = st.answers.reduce((s, g, i) => s + points(g, qs[i].v), 0);
      body.append(h("div", { class: "scale-head" },
        h("span", { class: "label" }, `Question ${Math.min(k + 1, ROUNDS)} of ${ROUNDS}`), h("b", {}, `${total} pts`)));

      if (k < ROUNDS) {
        const Q = qs[k];
        const mid = (Q.lo + Q.hi) / 2;
        const out = h("div", { class: "scale-val" });
        const slider = h("input", { type: "range", min: Q.lo, max: Q.hi, step: 0.01, value: mid, class: "scale-range" });
        const show = () => (out.innerHTML = `${fmt(10 ** +slider.value)} <small>${Q.unit}</small>`);
        slider.addEventListener("input", show);
        const ticks = h("div", { class: "scale-ticks" }, Array.from({ length: SPAN + 1 }, (_, i) => h("span", {}, fmt(10 ** (Q.lo + i)))));
        body.append(h("h3", { class: "scale-q" }, Q.q), out, slider, ticks,
          h("div", { class: "row-c" }, h("button", { class: "btn", onclick: () => {
            st.answers.push(10 ** +slider.value);
            ctx.save(st);
            if (st.answers.length === ROUNDS) {
              const t = st.answers.reduce((s, g, i) => s + points(g, qs[i].v), 0);
              ctx.win(`${t}/${ROUNDS * 100}\n${st.answers.map((g, i) => points(g, qs[i].v)).join(" · ")}`);
            }
            paint();
          } }, "Lock in")));
        show();
      }
      st.answers.slice().reverse().forEach((g, ri) => {
        const i = st.answers.length - 1 - ri;
        const Q = qs[i];
        body.append(h("div", { class: "scale-past" },
          h("p", {}, Q.q),
          h("div", {}, h("span", {}, `You: ${fmt(g)}`), h("span", {}, `Real: ${fmt(Q.v)} ${Q.unit}`), h("b", {}, `+${points(g, Q.v)}`))));
      });
    }
    paint();
  },
};
