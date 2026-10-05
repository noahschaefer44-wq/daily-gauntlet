import { h, shuffle, shake, flash } from "../core.js";
import { COMMON } from "../data/words.js";

const RANKS = [["Starter", 0], ["Good", 0.1], ["Solid", 0.25], ["Great", 0.4], ["Brilliant", 0.6], ["Complete", 1]];
const GOAL = 0.4; // "Great" counts as solved

export function makePuzzle(r) {
  const words = COMMON.filter((w) => !w.includes("s"));
  const pangrams = words.filter((w) => new Set(w).size === 7);
  for (let i = 0; i < 400; i++) {
    const p = pangrams[Math.floor(r() * pangrams.length)];
    const letters = [...new Set(p)];
    const center = letters[Math.floor(r() * 7)];
    const set = new Set(letters);
    const list = words.filter((w) => w.includes(center) && [...w].every((c) => set.has(c)));
    if (list.length >= 18 && list.length <= 70) {
      const outer = letters.filter((c) => c !== center);
      return { center, outer, list };
    }
  }
  throw new Error("no comb puzzle");
}

const points = (w) => (w.length === 4 ? 1 : w.length) + (new Set(w).size === 7 ? 7 : 0);

export default {
  id: "comb",
  name: "Comb",
  cat: "words",
  tint: "yellow",
  blurb: "Seven letters. How many words?",
  rules: `Make words of four or more letters. Every word must use the center letter; letters may repeat.
    Four-letter words score 1, longer words score their length, and a word that uses all seven letters earns 7 extra.
    Reach <b>Great</b> to clear the day, or keep going.`,
  cover: () => {
    const hex = (cx, cy, cls) => `<polygon class="${cls}" points="${[0, 1, 2, 3, 4, 5].map((i) => {
      const a = Math.PI / 3 * i; return `${cx + 17 * Math.cos(a)},${cy + 17 * Math.sin(a)}`; }).join(" ")}"/>`;
    const pos = [[80, 60, "t-present"], [80, 30, "t-card"], [80, 90, "t-card"], [54, 45, "t-card"], [106, 45, "t-card"], [54, 75, "t-card"], [106, 75, "t-card"]];
    return pos.map(([x, y, c]) => hex(x, y, c)).join("");
  },
  mount(root, ctx) {
    const pz = makePuzzle(ctx.rng);
    const max = pz.list.reduce((s, w) => s + points(w), 0);
    const st = ctx.state || { found: [] };
    let outer = pz.outer.slice();
    let cur = "";

    const rankEl = h("div", { class: "comb-rank" });
    const input = h("div", { class: "comb-input" });
    const hive = h("div", { class: "hive" });
    const foundEl = h("div", { class: "comb-found" });
    root.append(rankEl, input, hive,
      h("div", { class: "row-c" },
        h("button", { class: "btn ghost", onclick: () => { cur = cur.slice(0, -1); paint(); } }, "Delete"),
        h("button", { class: "btn ghost", onclick: () => { outer = shuffle(Math.random, outer); paint(); } }, "Shuffle"),
        h("button", { class: "btn", onclick: enter }, "Enter")),
      foundEl);

    const onDown = (e) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      if (e.key === "Enter") enter();
      else if (e.key === "Backspace") { cur = cur.slice(0, -1); paint(); }
      else if (/^[a-z]$/i.test(e.key)) { cur += e.key.toLowerCase(); paint(); }
    };
    document.addEventListener("keydown", onDown);
    ctx.cleanup(() => document.removeEventListener("keydown", onDown));

    const score = () => st.found.reduce((s, w) => s + points(w), 0);

    function paint() {
      const sc = score();
      const frac = sc / max;
      const rank = RANKS.filter(([, f]) => frac >= f).pop()[0];
      rankEl.innerHTML = "";
      rankEl.append(h("b", {}, rank), h("div", { class: "meter" }, RANKS.map(([n, f]) =>
        h("i", { class: frac >= f ? "on" : "", style: { left: `${f * 100}%` }, title: n }))),
        h("span", {}, `${sc} pts`));
      rankEl.querySelector(".meter").style.setProperty("--p", `${Math.min(1, frac) * 100}%`);
      input.innerHTML = "";
      [...cur].forEach((c) => input.append(h("span", { class: c === pz.center ? "ctr" : pz.outer.includes(c) ? "" : "bad" }, c)));
      if (!cur) input.append(h("span", { class: "ph" }, "Type or tap"));
      hive.innerHTML = "";
      const cells = [pz.center, ...outer];
      cells.forEach((c, i) => hive.append(h("button", { class: "cell" + (i === 0 ? " ctr" : ""), style: { "--i": i }, onclick: () => { cur += c; paint(); } }, c)));
      foundEl.innerHTML = "";
      foundEl.append(h("div", { class: "label" }, `${st.found.length} of ${pz.list.length} words`),
        h("div", { class: "words" }, [...st.found].sort().map((w) => h("span", { class: new Set(w).size === 7 ? "pg" : "" }, w))));
    }

    function enter() {
      const w = cur;
      cur = "";
      if (!w) return;
      let err = null;
      if (w.length < 4) err = "Too short";
      else if (!w.includes(pz.center)) err = "Missing center letter";
      else if ([...w].some((c) => c !== pz.center && !pz.outer.includes(c))) err = "Bad letters";
      else if (st.found.includes(w)) err = "Already found";
      else if (!pz.list.includes(w)) err = "Not in word list";
      if (err) { shake(input); flash(err); return paint(); }
      st.found.push(w);
      flash(new Set(w).size === 7 ? `Pangram! +${points(w)}` : `+${points(w)}`);
      ctx.save(st);
      paint();
      if (ctx.status === "playing" && score() >= max * GOAL) ctx.win(`${score()} pts, ${st.found.length} words`, null, true);
      else if (ctx.status === "won") ctx.update(`${score()} pts, ${st.found.length} words`);
    }

    paint();
  },
};
