import { h, keyboard, score, shake, flash, shuffle } from "../core.js";
import { ANSWERS5, VALID5 } from "../data/words.js";

const valid = new Set(VALID5);
const QWERTY = ["QWERTYUIOP", "ASDFGHJKL", ["ENTER", ..."ZXCVBNM", "BACK"]];
const TRIES = 9;

export default {
  id: "quartet",
  name: "Quartet",
  cat: "words",
  tint: "yellow",
  blurb: "Four hidden words, nine shared guesses.",
  rules: `Every guess goes onto all four boards at once. Solve all four five-letter words within nine guesses.
    A board freezes when you solve it.`,
  cover: () => [0, 1, 2, 3].map((q) => {
    const x = 10 + (q % 2) * 74, y = 8 + Math.floor(q / 2) * 54;
    return [0, 1, 2].map((r) => [0, 1, 2, 3, 4].map((c) => {
      const s = (r === 2 && q !== 1) ? "correct" : (r + c + q) % 4 === 0 ? "present" : (r === 2 ? "empty" : "absent");
      return `<rect x="${x + c * 13.5}" y="${y + r * 15}" width="11.5" height="12.5" class="t-${s}"/>`;
    }).join("")).join("");
  }).join(""),
  mount(root, ctx) {
    const answers = shuffle(ctx.rng, ANSWERS5).slice(0, 4).map((w) => w.toUpperCase());
    const st = ctx.state || { guesses: [] };
    let cur = "";

    const boards = answers.map(() => h("div", { class: "qboard" }));
    const wrap = h("div", { class: "quartet" }, boards);
    const kb = keyboard(QWERTY, onKey, ctx);
    root.append(wrap, kb.el);

    const solvedAt = (b) => st.guesses.indexOf(answers[b]);

    function paint() {
      boards.forEach((el, b) => {
        el.innerHTML = "";
        const done = solvedAt(b);
        el.classList.toggle("solved", done !== -1);
        const shown = done === -1 ? st.guesses : st.guesses.slice(0, done + 1);
        for (let r = 0; r < TRIES; r++) {
          const row = h("div", { class: "grow" });
          const g = shown[r];
          const live = done === -1 && r === st.guesses.length;
          const res = g ? score(g, answers[b]) : [];
          for (let c = 0; c < 5; c++) {
            const t = h("div", { class: "tile sm" }, g ? g[c] : live ? cur[c] || "" : "");
            t.dataset.state = g ? res[c] : live && cur[c] ? "typed" : "";
            row.append(t);
          }
          el.append(row);
        }
      });
      // Keyboard shows the best state across boards still in play.
      for (const g of st.guesses) answers.forEach((a, b) => {
        if (solvedAt(b) !== -1 && solvedAt(b) < st.guesses.indexOf(g)) return;
        score(g, a).forEach((s, i) => kb.mark(g[i], s));
      });
    }

    function onKey(k) {
      if (ctx.status !== "playing") return;
      if (k === "BACK") cur = cur.slice(0, -1);
      else if (k === "ENTER") {
        if (cur.length < 5) { shake(wrap); return flash("Not enough letters"); }
        if (!valid.has(cur.toLowerCase())) { shake(wrap); return flash("Not in word list"); }
        st.guesses.push(cur);
        cur = "";
        ctx.save(st);
        paint();
        const solved = answers.filter((_, b) => solvedAt(b) !== -1).length;
        const summary = answers.map((_, b) => (solvedAt(b) === -1 ? "X" : solvedAt(b) + 1)).join(" ");
        if (solved === 4) ctx.win(`${st.guesses.length}/${TRIES}\n${summary}`);
        else if (st.guesses.length === TRIES) ctx.lose(`X/${TRIES}\n${summary}`, `The words were ${answers.join(", ")}.`);
        return;
      } else if (cur.length < 5) cur += k;
      paint();
    }
    paint();
  },
};
