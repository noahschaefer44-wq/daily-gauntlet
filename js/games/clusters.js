import { h, shuffle, shake, flash } from "../core.js";
import { CATEGORIES } from "../data/clusters.js";

const MISTAKES = 4;

export function makePuzzle(r) {
  const byLevel = [1, 2, 3, 4].map((l) => CATEGORIES.filter((c) => c[0] === l));
  for (let attempt = 0; attempt < 500; attempt++) {
    const cats = byLevel.map((list) => list[Math.floor(r() * list.length)]);
    const full = cats.map((c) => c[2].split(" "));
    const groups = full.map((words) => shuffle(r, words).slice(0, 4));
    // Reject if a picked word also belongs to another picked category.
    const clash = groups.some((g, i) => g.some((w) => full.some((f, j) => j !== i && f.includes(w))));
    const all = groups.flat();
    if (clash || new Set(all).size !== 16) continue;
    return cats.map((c, i) => ({ level: c[0], name: c[1], words: groups[i] }));
  }
  throw new Error("no clusters puzzle");
}

export default {
  id: "clusters",
  name: "Clusters",
  cat: "words",
  tint: "blue",
  blurb: "Sixteen words. Four hidden groups.",
  rules: `Select four words that share something and submit. Groups run from straightforward to devious.
    Four mistakes and the game is over.`,
  cover: () => [0, 1, 2, 3].map((r) => [0, 1, 2, 3].map((c) =>
    `<rect x="${12 + c * 35}" y="${8 + r * 27}" width="31" height="23" rx="3" class="${r === 0 ? "t-l1" : r === 1 && c > 1 ? "t-sel" : "t-card"}"/>`).join("")).join(""),
  mount(root, ctx) {
    const groups = makePuzzle(ctx.rng);
    const st = ctx.state || { order: shuffle(ctx.rng, groups.flatMap((g) => g.words)), found: [], mistakes: 0, tries: [] };
    let sel = [];

    const solvedEl = h("div", { class: "cl-solved" });
    const gridEl = h("div", { class: "cl-grid" });
    const dots = h("div", { class: "cl-dots" });
    const btnShuffle = h("button", { class: "btn ghost", onclick: () => { st.order = shuffle(Math.random, st.order); ctx.save(st); paint(); } }, "Shuffle");
    const btnClear = h("button", { class: "btn ghost", onclick: () => { sel = []; paint(); } }, "Deselect");
    const btnSubmit = h("button", { class: "btn", onclick: submit }, "Submit");
    root.append(solvedEl, gridEl, h("div", { class: "row-c" }, h("span", { class: "label" }, "Mistakes left"), dots),
      h("div", { class: "row-c" }, btnShuffle, btnClear, btnSubmit));

    const groupOf = (w) => groups.findIndex((g) => g.words.includes(w));

    function paint() {
      solvedEl.innerHTML = "";
      const show = ctx.status === "lost" ? groups.map((_, i) => i) : st.found;
      for (const gi of show) {
        const g = groups[gi];
        solvedEl.append(h("div", { class: `cl-band l${g.level}` }, h("b", {}, g.name), h("span", {}, g.words.join(", "))));
      }
      gridEl.innerHTML = "";
      for (const w of st.order) {
        if (show.includes(groupOf(w))) continue;
        gridEl.append(h("button", {
          class: "cl-word" + (sel.includes(w) ? " on" : "") + (w.length > 8 ? " long" : ""),
          onclick: () => toggle(w),
        }, w));
      }
      dots.innerHTML = "";
      for (let i = 0; i < MISTAKES; i++) dots.append(h("i", { class: i < MISTAKES - st.mistakes ? "on" : "" }));
      btnSubmit.disabled = sel.length !== 4 || ctx.status !== "playing";
    }

    function toggle(w) {
      if (ctx.status !== "playing") return;
      if (sel.includes(w)) sel = sel.filter((x) => x !== w);
      else if (sel.length < 4) sel.push(w);
      paint();
    }

    function submit() {
      if (sel.length !== 4 || ctx.status !== "playing") return;
      const key = [...sel].sort().join();
      if (st.tries.includes(key)) return flash("Already tried");
      st.tries.push(key);
      const counts = {};
      sel.forEach((w) => (counts[groupOf(w)] = (counts[groupOf(w)] || 0) + 1));
      const best = Math.max(...Object.values(counts));
      const line = sel.map((w) => "1234"[groups[groupOf(w)].level - 1]).join("");
      (st.lines ||= []).push(line);
      if (best === 4) {
        st.found.push(groupOf(sel[0]));
        sel = [];
      } else {
        st.mistakes++;
        shake(gridEl);
        flash(best === 3 ? "One away" : "Not a group");
      }
      ctx.save(st);
      paint();
      const share = st.lines.join("\n");
      if (st.found.length === 4) ctx.win(`${st.mistakes} mistake${st.mistakes === 1 ? "" : "s"}\n${share}`);
      else if (st.mistakes >= MISTAKES) { ctx.lose(`${st.found.length}/4 groups\n${share}`); paint(); }
    }

    paint();
  },
};
