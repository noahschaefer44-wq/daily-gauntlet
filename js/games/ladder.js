import { h, keyboard, shake, flash } from "../core.js";
import { FOUR, VALID4 } from "../data/words.js";

const valid = new Set(VALID4);
const QWERTY = ["QWERTYUIOP", "ASDFGHJKL", ["ENTER", ..."ZXCVBNM", "BACK"]];
const oneOff = (a, b) => [...a].filter((c, i) => c !== b[i]).length === 1;

function graph(words) {
  const buckets = new Map();
  for (const w of words) for (let i = 0; i < 4; i++) {
    const k = w.slice(0, i) + "_" + w.slice(i + 1);
    (buckets.get(k) || buckets.set(k, []).get(k)).push(w);
  }
  return (w) => {
    const out = new Set();
    for (let i = 0; i < 4; i++) for (const n of buckets.get(w.slice(0, i) + "_" + w.slice(i + 1)) || []) if (n !== w) out.add(n);
    return [...out];
  };
}

function bfs(next, from) {
  const prev = new Map([[from, null]]);
  const q = [from];
  while (q.length) {
    const w = q.shift();
    for (const n of next(w)) if (!prev.has(n)) { prev.set(n, w); q.push(n); }
  }
  return prev;
}

export function makePuzzle(r) {
  const next = graph(FOUR);
  for (let i = 0; i < 300; i++) {
    const a = FOUR[Math.floor(r() * FOUR.length)];
    const prev = bfs(next, a);
    const far = [...prev.keys()].filter((w) => {
      let d = 0; for (let x = w; prev.get(x); x = prev.get(x)) d++;
      return d >= 4 && d <= 6 && [...w].every((c, k) => c !== a[k]);
    });
    if (!far.length) continue;
    const b = far[Math.floor(r() * far.length)];
    const path = [];
    for (let x = b; x; x = prev.get(x)) path.unshift(x);
    return { start: a.toUpperCase(), end: b.toUpperCase(), path: path.map((w) => w.toUpperCase()) };
  }
  throw new Error("no ladder");
}

export default {
  id: "ladder",
  name: "Ladder",
  cat: "words",
  tint: "red",
  blurb: "Climb from one word to another, one letter at a time.",
  rules: `Change exactly one letter per step. Every step must be a real four-letter word.
    Reach the bottom word. Fewer steps is better: par is the shortest possible ladder.`,
  cover: () => ["COLD", "CORD", "WORD", "WARD", "WARM"].map((w, r) => [...w].map((l, c) =>
    `<rect x="${44 + c * 18}" y="${6 + r * 22}" width="16" height="18" class="${r === 0 || r === 4 ? "t-ink" : c === [0, 2, 0, 1, 3][r] ? "t-correct" : "t-card"}"/>
     <text x="${52 + c * 18}" y="${19 + r * 22}" class="tl sm ${r === 0 || r === 4 || c === [0, 2, 0, 1, 3][r] ? "inv" : ""}">${l}</text>`).join("")).join(""),
  mount(root, ctx) {
    const pz = makePuzzle(ctx.rng);
    const par = pz.path.length - 2;
    const st = ctx.state || { steps: [] };
    let cur = "";

    const list = h("div", { class: "ladder" });
    const kb = keyboard(QWERTY, onKey, ctx);
    const undo = h("button", { class: "btn ghost", onclick: () => { if (ctx.status === "playing" && st.steps.length) { st.steps.pop(); ctx.save(st); paint(); } } }, "Undo step");
    root.append(h("p", { class: "label center" }, `Par: ${par} steps in between`), list, h("div", { class: "row-c" }, undo), kb.el);

    const rowOf = (w, cls) => h("div", { class: "lrow " + cls }, [...w.padEnd(4)].map((c, i) =>
      h("div", { class: "tile" + (c.trim() && c === pz.end[i] ? " hit" : ""), "data-state": cls === "typing" && c.trim() ? "typed" : "" }, c.trim())));

    function paint() {
      list.innerHTML = "";
      list.append(rowOf(pz.start, "fixed"));
      st.steps.forEach((w) => list.append(rowOf(w, "done")));
      if (ctx.status === "playing") list.append(rowOf(cur, "typing"));
      list.append(rowOf(pz.end, "fixed end"));
    }

    function onKey(k) {
      if (ctx.status !== "playing") return;
      if (k === "BACK") cur = cur.slice(0, -1);
      else if (k === "ENTER") {
        const prev = st.steps[st.steps.length - 1] || pz.start;
        let err = null;
        if (cur.length < 4) err = "Four letters";
        else if (!valid.has(cur.toLowerCase())) err = "Not a word";
        else if (!oneOff(prev, cur)) err = "Change exactly one letter";
        if (err) { shake(list.lastChild.previousSibling); return flash(err); }
        if (cur !== pz.end) st.steps.push(cur);
        cur = "";
        ctx.save(st);
        if (st.steps.length && oneOff(st.steps[st.steps.length - 1], pz.end)) {
          const n = st.steps.length;
          ctx.win(`${n} step${n === 1 ? "" : "s"} (par ${par})\n${pz.start} > ${st.steps.join(" > ")} > ${pz.end}`,
            n === par ? "Perfect ladder." : `Shortest: ${pz.path.join(" > ")}`);
        }
      } else if (cur.length < 4) cur += k;
      paint();
    }
    paint();
  },
};
