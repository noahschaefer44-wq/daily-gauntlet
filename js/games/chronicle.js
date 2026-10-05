import { h, shuffle, shake, flash } from "../core.js";
import { EVENTS } from "../data/events.js";

const COUNT = 6, TRIES = 3;
const yearText = (y) => (y < 0 ? `${-y} BC` : `${y}`);

export function makePuzzle(r) {
  for (;;) {
    const pickd = shuffle(r, EVENTS).slice(0, COUNT);
    if (new Set(pickd.map((e) => e[0])).size === COUNT) return pickd;
  }
}

export default {
  id: "chronicle",
  name: "Chronicle",
  cat: "geo",
  tint: "paper",
  blurb: "Six moments in history. Put them in order.",
  rules: `Arrange the six events from oldest (top) to newest (bottom). Tap two cards to swap them, or use the arrows.
    You get three checks; cards in the right spot lock in place.`,
  cover: () => [0, 1, 2, 3].map((i) => `<rect x="${30 + i * 6}" y="${12 + i * 22}" width="100" height="18" class="${i === 1 ? "t-correct" : "t-card"}"/>
    <text x="${44 + i * 6}" y="${25 + i * 22}" class="tl xs ${i === 1 ? "inv" : ""}" text-anchor="start">${["1066", "1492", "1789", "1969"][i]}</text>`).join(""),
  mount(root, ctx) {
    const events = makePuzzle(ctx.rng);
    const sorted = events.slice().sort((x, y) => x[0] - y[0]);
    const st = ctx.state || { order: events.map((e) => e[1]), checks: [], locked: [] };
    let sel = -1;

    const list = h("ol", { class: "chron" });
    const info = h("p", { class: "label center" });
    root.append(info, list, h("div", { class: "row-c" }, h("button", { class: "btn", onclick: check }, "Check order")));

    const yearOf = (txt) => events.find((e) => e[1] === txt)[0];

    function swap(i, j) {
      if (j < 0 || j >= COUNT || st.locked.includes(i) || st.locked.includes(j)) return;
      [st.order[i], st.order[j]] = [st.order[j], st.order[i]];
      ctx.save(st);
      paint();
    }

    function tap(i) {
      if (ctx.status !== "playing" || st.locked.includes(i)) return;
      if (sel === -1) sel = i;
      else { const s = sel; sel = -1; if (s !== i) return swap(s, i); }
      paint();
    }

    function check() {
      if (ctx.status !== "playing") return;
      const right = st.order.map((t, i) => t === sorted[i][1]);
      st.locked = right.map((ok, i) => (ok ? i : -1)).filter((i) => i >= 0);
      st.checks.push(right.map((ok) => (ok ? "■" : "□")).join(""));
      ctx.save(st);
      if (right.every(Boolean)) ctx.win(`${st.checks.length}/${TRIES}\n${st.checks.join("\n")}`);
      else if (st.checks.length >= TRIES) {
        st.order = sorted.map((e) => e[1]);
        ctx.lose(`X/${TRIES}\n${st.checks.join("\n")}`, "The correct order is shown.");
      } else { shake(list); flash(`${right.filter(Boolean).length} of ${COUNT} in place`); }
      paint();
    }

    function paint() {
      list.innerHTML = "";
      const reveal = ctx.status !== "playing";
      st.order.forEach((txt, i) => {
        const locked = st.locked.includes(i) || ctx.status === "won";
        list.append(h("li", { class: "chron-item" + (locked ? " locked" : "") + (sel === i ? " sel" : "") },
          h("button", { class: "chron-main", onclick: () => tap(i) },
            h("span", { class: "yr" }, reveal || locked ? yearText(yearOf(txt)) : "????"), h("span", {}, txt)),
          h("span", { class: "chron-arrows" },
            h("button", { "aria-label": "Move up", onclick: () => swap(i, i - 1), disabled: reveal || locked }, "▲"),
            h("button", { "aria-label": "Move down", onclick: () => swap(i, i + 1), disabled: reveal || locked }, "▼"))));
      });
      info.textContent = `Oldest on top  ·  ${TRIES - st.checks.length} check${TRIES - st.checks.length === 1 ? "" : "s"} left`;
    }
    paint();
  },
};
