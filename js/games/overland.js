import { h, pick, flash } from "../core.js";
import { loadGeo, countryInput, loading } from "../geo.js";

function dists(countries, from) {
  const d = new Map([[from, 0]]);
  const q = [from];
  while (q.length) {
    const i = q.shift();
    for (const n of countries[i].neighbors) if (!d.has(n)) { d.set(n, d.get(i) + 1); q.push(n); }
  }
  return d;
}

export default {
  id: "overland",
  name: "Overland",
  cat: "geo",
  tint: "red",
  blurb: "Connect two countries by land.",
  rules: `Name the countries that link the start to the destination over land borders.
    Green guesses lie on a shortest route, amber ones are close to it, grey ones lead nowhere.
    You win as soon as your guesses form any land chain between the two.`,
  cover: () => `<circle cx="34" cy="70" r="11" class="t-ink"/><circle cx="126" cy="38" r="11" class="t-lamp"/>
    <path d="M45 66 Q70 30 92 56 T115 42" class="trail"/>
    <rect x="60" y="44" width="16" height="16" class="t-correct"/><rect x="88" y="48" width="16" height="16" class="t-present"/>`,
  async mount(root, ctx) {
    const wait = loading(root);
    let geo;
    try { geo = await loadGeo(); } catch { wait.textContent = "Could not load map data. Check your connection."; return; }
    wait.remove();
    const { d3, countries } = geo;
    const targetSet = new Set(geo.targets.map((c) => c.i));

    let a, b, D, fromA, fromB;
    for (;;) {
      a = pick(ctx.rng, geo.targets).i;
      fromA = dists(countries, a);
      const far = [...fromA].filter(([i, d]) => d >= 3 && d <= 5 && targetSet.has(i)).map(([i]) => i);
      if (!far.length) continue;
      b = pick(ctx.rng, far);
      D = fromA.get(b);
      fromB = dists(countries, b);
      break;
    }
    const minMid = D - 1;
    const TRIES = minMid + 4;
    const st = ctx.state || { guesses: [] };

    const mapEl = h("div", { class: "overland-map" });
    const head = h("div", { class: "overland-head" },
      h("span", { class: "pin a" }, countries[a].name), h("i", {}, "to"), h("span", { class: "pin b" }, countries[b].name));
    const info = h("p", { class: "label center" });
    const list = h("div", { class: "geo-chips" });
    const { form, input } = countryInput(geo, guess, "Add a country");
    root.append(head, mapEl, info, form, list);

    const kind = (i) => {
      const da = fromA.get(i), db = fromB.get(i);
      if (da != null && db != null && da + db === D) return "on";
      if (da != null && db != null && da + db <= D + 2) return "near";
      return "off";
    };

    function connected() {
      const ok = new Set([a, b, ...st.guesses.map((n) => geo.find(n).i)]);
      const seen = new Set([a]);
      const q = [a];
      while (q.length) {
        const i = q.shift();
        if (i === b) return true;
        for (const n of countries[i].neighbors) if (ok.has(n) && !seen.has(n)) { seen.add(n); q.push(n); }
      }
      return false;
    }

    function guess(text, clear) {
      if (ctx.status !== "playing") return;
      const c = geo.find(text);
      if (!c) return flash("Unknown country");
      if (c.i === a || c.i === b) return flash("That's an endpoint");
      if (st.guesses.includes(c.name)) return flash("Already guessed");
      st.guesses.push(c.name);
      clear();
      ctx.save(st);
      paint();
      const share = st.guesses.map((n) => ({ on: "■", near: "▣", off: "□" })[kind(geo.find(n).i)]).join("");
      if (connected()) ctx.win(`${st.guesses.length} guesses (best ${minMid})\n${share}`);
      else if (st.guesses.length >= TRIES) {
        const route = [];
        for (let i = a, d = 0; i !== b; d++) { i = countries[i].neighbors.find((n) => fromA.get(n) === d + 1 && fromB.get(n) === D - d - 1); route.push(i); }
        ctx.lose(`X\n${share}`, `One route: ${[a, ...route].map((i) => countries[i].name).join(" > ")}`);
        paint();
      }
    }

    function paint() {
      const guessed = st.guesses.map((n) => geo.find(n));
      const focus = [countries[a].main, countries[b].main, ...guessed.map((c) => c.main)];
      const fc = { type: "FeatureCollection", features: focus };
      const mid = d3.geoCentroid({ type: "FeatureCollection", features: [countries[a].main, countries[b].main] });
      const proj = d3.geoAzimuthalEqualArea().rotate([-mid[0], -mid[1]]).fitExtent([[24, 24], [576, 376]], fc);
      const path = d3.geoPath(proj);
      const cls = new Map([[a, "a"], [b, "b"], ...guessed.map((c) => [c.i, kind(c.i)])]);
      mapEl.innerHTML = `<svg viewBox="0 0 600 400">${countries.map((c) =>
        `<path d="${path(c.f) || ""}" class="${cls.get(c.i) || "land"}"/>`).join("")}</svg>`;
      info.textContent = `${st.guesses.length} of ${TRIES} guesses  ·  shortest route needs ${minMid}`;
      list.innerHTML = "";
      guessed.forEach((c) => list.append(h("span", { class: "gchip " + kind(c.i) }, c.name)));
      input.disabled = ctx.status !== "playing";
    }
    paint();
  },
};
