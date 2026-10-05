import { h, keyboard, randInt, flash, shake } from "../core.js";

const TRIES = 5;
const D = "0123456789ABCDEF";

const hint = (g, a) => {
  const d = D.indexOf(a) - D.indexOf(g);
  if (!d) return "=";
  return (d > 0 ? "↑" : "↓") + (Math.abs(d) > 3 ? (d > 0 ? "↑" : "↓") : "");
};

export default {
  id: "hex",
  name: "Hex",
  cat: "numbers",
  tint: "paper",
  blurb: "Name the colour by its hex code.",
  rules: `Guess the six-digit hex code of the colour swatch. Each digit gets a hint:
    <b>=</b> exact, <b>↑</b> or <b>↓</b> the real digit is higher or lower, a double arrow means it is more than 3 away.`,
  cover: () => `<rect x="20" y="16" width="56" height="70" fill="#e07a3f" class="sw"/>
    <rect x="84" y="16" width="56" height="70" fill="#c9673a" class="sw"/>
    <text x="80" y="106" class="tl sm">#E07A3F</text>`,
  mount(root, ctx) {
    const answer = Array.from({ length: 6 }, () => D[randInt(ctx.rng, 16)]).join("");
    const st = ctx.state || { guesses: [] };
    let cur = "";

    const swatches = h("div", { class: "hex-sw" },
      h("div", { style: { background: "#" + answer } }, h("span", {}, "Target")),
      h("div", { class: "yours" }, h("span", {}, "Your guess")));
    const board = h("div", { class: "hex-board" });
    const kb = keyboard(["0123456789", ["A", "B", "C", "D", "E", "F"], ["ENTER", "BACK"]], onKey, ctx);
    root.append(swatches, board, kb.el);

    function onKey(k) {
      if (ctx.status !== "playing") return;
      if (k === "BACK") cur = cur.slice(0, -1);
      else if (k === "ENTER") {
        if (cur.length < 6) { shake(board); return flash("Six digits"); }
        st.guesses.push(cur);
        cur = "";
        ctx.save(st);
        paint();
        const n = st.guesses.length;
        const share = st.guesses.map((g) => [...g].map((c, i) => (c === answer[i] ? "■" : "□")).join("")).join("\n");
        if (st.guesses[n - 1] === answer) ctx.win(`${n}/${TRIES}\n${share}`);
        else if (n === TRIES) { ctx.lose(`X/${TRIES}\n${share}`, `It was #${answer}.`); paint(); }
        return;
      } else if (cur.length < 6) cur += k;
      paint();
    }

    function paint() {
      board.innerHTML = "";
      for (let r = 0; r < TRIES; r++) {
        const g = st.guesses[r];
        const text = g || (r === st.guesses.length ? cur : "");
        board.append(h("div", { class: "hex-row" },
          h("i", { class: "chip", style: { background: g ? "#" + g : "transparent" } }),
          [...Array(6)].map((_, i) => h("div", { class: "tile", "data-state": g ? (g[i] === answer[i] ? "correct" : "absent") : text[i] ? "typed" : "" },
            h("span", {}, text[i] || ""), g && g[i] !== answer[i] ? h("small", {}, hint(g[i], answer[i])) : null))));
      }
      const last = cur.length === 6 ? cur : st.guesses[st.guesses.length - 1];
      swatches.lastChild.style.background = last ? "#" + last : "transparent";
    }
    paint();
  },
};
