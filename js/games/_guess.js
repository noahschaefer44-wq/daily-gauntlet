import { h, keyboard, score, shake, flash, marks } from "../core.js";

// Generic "guess the hidden sequence" board used by Inkwell, Equal and Prime.
export function guessBoard(root, ctx, cfg) {
  const { length, tries, answer, rows, validate } = cfg;
  const st = ctx.state || { guesses: [] };
  let cur = "";

  const grid = h("div", { class: "gboard", style: { "--cols": length } });
  const rowEls = [];
  for (let r = 0; r < tries; r++) {
    const row = h("div", { class: "grow" });
    for (let c = 0; c < length; c++) row.append(h("div", { class: "tile" }));
    rowEls.push(row);
    grid.append(row);
  }

  const kb = keyboard(rows, onKey, ctx);
  root.append(grid, kb.el);

  function paint() {
    st.guesses.forEach((g, r) => {
      const res = score(g, answer);
      [...rowEls[r].children].forEach((t, i) => {
        t.textContent = g[i];
        t.dataset.state = res[i];
        kb.mark(g[i], res[i]);
      });
    });
    const r = st.guesses.length;
    if (r < tries) {
      [...rowEls[r].children].forEach((t, i) => {
        t.textContent = cur[i] || "";
        t.dataset.state = cur[i] ? "typed" : "";
      });
    }
  }

  function finished() { return ctx.status !== "playing"; }

  function onKey(k) {
    if (finished()) return;
    if (k === "BACK") cur = cur.slice(0, -1);
    else if (k === "ENTER") {
      if (cur.length < length) { shake(rowEls[st.guesses.length]); return flash("Not enough characters"); }
      const err = validate(cur);
      if (err) { shake(rowEls[st.guesses.length]); return flash(err); }
      st.guesses.push(cur);
      cur = "";
      ctx.save(st);
      paint();
      const n = st.guesses.length;
      const grid = st.guesses.map((g) => score(g, answer).map((s) => marks[s]).join("")).join("\n");
      if (st.guesses[n - 1] === answer) ctx.win(`${n}/${tries}\n${grid}`);
      else if (n === tries) ctx.lose(`X/${tries}\n${grid}`, `The answer was ${answer}.`);
      return;
    } else if (cur.length < length) cur += k;
    paint();
  }

  paint();
}
