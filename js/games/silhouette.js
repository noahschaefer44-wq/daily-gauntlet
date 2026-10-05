import { h, pick, flash } from "../core.js";
import { loadGeo, km, bearing, countryInput, loading } from "../geo.js";

const TRIES = 6;

export default {
  id: "silhouette",
  name: "Silhouette",
  cat: "geo",
  tint: "green",
  blurb: "Name the country from its outline.",
  rules: `Identify the country from its shape. After each wrong guess you see the distance from your guess
    to the answer and the direction to travel. Six tries.`,
  cover: () => `<path d="M58 28 L74 22 L92 30 L106 26 L116 40 L110 54 L118 66 L104 84 L88 80 L78 92 L64 84 L60 68 L48 60 L52 44 Z" class="t-ink"/>
    <path d="M128 92 l8 -8 m0 0 l-7 0 m7 0 l0 7" class="ray"/>`,
  async mount(root, ctx) {
    const wait = loading(root);
    let geo;
    try { geo = await loadGeo(); } catch { wait.textContent = "Could not load map data. Check your connection."; return; }
    wait.remove();
    const { d3 } = geo;
    const answer = pick(ctx.rng, geo.targets);
    const st = ctx.state || { guesses: [] };

    const proj = d3.geoAzimuthalEqualArea().rotate([-answer.centroid[0], -answer.centroid[1]]).fitExtent([[20, 20], [380, 300]], answer.main);
    const path = d3.geoPath(proj);
    const svg = `<svg viewBox="0 0 400 320" class="silhouette"><path d="${path(answer.main)}"/></svg>`;
    const list = h("div", { class: "geo-list" });
    const { form, input } = countryInput(geo, guess);
    root.append(h("div", { class: "center", html: svg }), list, form);

    function guess(text, clear) {
      if (ctx.status !== "playing") return;
      const c = geo.find(text);
      if (!c) return flash("Unknown country");
      if (st.guesses.includes(c.name)) return flash("Already guessed");
      st.guesses.push(c.name);
      clear();
      ctx.save(st);
      paint();
      const n = st.guesses.length;
      const share = st.guesses.map((g) => (g === answer.name ? "■ hit" : `□ ${km(d3, geo.find(g).centroid, answer.centroid)} km`)).join("\n");
      if (c === answer) ctx.win(`${n}/${TRIES}\n${share}`);
      else if (n === TRIES) { ctx.lose(`X/${TRIES}\n${share}`, `It was ${answer.name}.`); paint(); }
    }

    function paint() {
      list.innerHTML = "";
      for (let r = 0; r < TRIES; r++) {
        const g = st.guesses[r];
        if (!g) { list.append(h("div", { class: "geo-row empty" }, " ")); continue; }
        const c = geo.find(g);
        const hit = c === answer;
        const d = km(d3, c.centroid, answer.centroid);
        const pct = Math.round(100 * (1 - d / 20000));
        const dir = bearing(c.centroid, answer.centroid);
        list.append(h("div", { class: "geo-row" + (hit ? " hit" : "") },
          h("b", {}, c.name), h("span", {}, hit ? "—" : `${d.toLocaleString("en-US")} km`),
          h("span", { class: "arrow", html: hit ? "●" : `<svg viewBox="0 0 20 20" style="transform:rotate(${dir}deg)"><path d="M10 2 L16 12 L11 12 L11 18 L9 18 L9 12 L4 12 Z"/></svg>` }),
          h("span", {}, `${hit ? 100 : pct}%`)));
      }
      input.disabled = ctx.status !== "playing";
    }
    paint();
  },
};
