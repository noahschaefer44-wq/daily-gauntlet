import { h, randInt, flash } from "../core.js";

const TRIES = 4;

export default {
  id: "degree",
  name: "Degree",
  cat: "numbers",
  tint: "green",
  blurb: "Eyeball the angle. Four tries.",
  rules: `Guess the size of the drawn angle in whole degrees. You have four tries; each wrong guess tells you
    to go higher or lower and how close you are. Within 2° counts as a hit.`,
  cover: () => `<path d="M40 90 L130 90" class="ray"/><path d="M40 90 L112 30" class="ray"/>
    <path d="M70 90 A30 30 0 0 0 63 71" class="arc"/><text x="88" y="80" class="tl xs">?°</text>`,
  mount(root, ctx) {
    const angle = 10 + randInt(ctx.rng, 341);
    const rot = randInt(ctx.rng, 360);
    const st = ctx.state || { guesses: [] };

    const rad = (d) => (d * Math.PI) / 180;
    const p = (d, r) => `${150 + r * Math.cos(rad(d))},${150 - r * Math.sin(rad(d))}`;
    const large = angle > 180 ? 1 : 0;
    const svg = `<svg viewBox="0 0 300 300" class="degree-svg">
      <circle cx="150" cy="150" r="130" class="ring"/>
      <path d="M${p(rot, 46)} A46 46 0 ${large} 0 ${p(rot + angle, 46)}" class="arc"/>
      <path d="M150 150 L${p(rot, 130)}" class="ray"/><path d="M150 150 L${p(rot + angle, 130)}" class="ray"/>
      <circle cx="150" cy="150" r="5" class="hub"/></svg>`;

    const input = h("input", { type: "number", min: 0, max: 360, inputmode: "numeric", class: "num-in", placeholder: "degrees" });
    const list = h("div", { class: "degree-list" });
    root.append(h("div", { class: "center", html: svg }), list,
      h("form", { class: "row-c", onsubmit: (e) => { e.preventDefault(); guess(); } }, input, h("button", { class: "btn" }, "Guess")));

    function guess() {
      if (ctx.status !== "playing") return;
      const v = Math.round(+input.value);
      if (!input.value || v < 0 || v > 360) return flash("0 to 360");
      st.guesses.push(v);
      input.value = "";
      ctx.save(st);
      paint();
      const n = st.guesses.length;
      const share = st.guesses.map((g) => `${g}° ${Math.abs(g - angle) <= 2 ? "hit" : g < angle ? "↑" : "↓"}`).join("\n");
      if (Math.abs(v - angle) <= 2) ctx.win(`${n}/${TRIES}\n${share}`, `Exact angle: ${angle}°.`);
      else if (n === TRIES) { ctx.lose(`X/${TRIES}\n${share}`, `It was ${angle}°.`); paint(); }
    }
    function paint() {
      list.innerHTML = "";
      st.guesses.forEach((g) => {
        const off = Math.abs(g - angle);
        const heat = off <= 2 ? "hit" : off <= 10 ? "hot" : off <= 30 ? "warm" : "cold";
        list.append(h("div", { class: "dg " + heat }, h("b", {}, `${g}°`),
          h("span", {}, off <= 2 ? "Hit" : `${g < angle ? "Higher" : "Lower"}  ·  ${heat}`)));
      });
      input.disabled = ctx.status !== "playing";
    }
    paint();
  },
};
