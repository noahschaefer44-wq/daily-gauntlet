import { h, store, dayKey, issueNo, rng, flash, hashStr } from "./core.js";
import { LINKS } from "./links.js";

import inkwell from "./games/inkwell.js";
import quartet from "./games/quartet.js";
import clusters from "./games/clusters.js";
import comb from "./games/comb.js";
import ladder from "./games/ladder.js";
import trace from "./games/trace.js";
import nine from "./games/nine.js";
import six from "./games/six.js";
import crowns from "./games/crowns.js";
import tide from "./games/tide.js";
import thread from "./games/thread.js";
import pixel from "./games/pixel.js";
import switchboard from "./games/switchboard.js";
import triad from "./games/triad.js";
import codebreak from "./games/codebreak.js";
import equal from "./games/equal.js";
import prime from "./games/prime.js";
import hex from "./games/hex.js";
import degree from "./games/degree.js";
import scale from "./games/scale.js";
import silhouette from "./games/silhouette.js";
import overland from "./games/overland.js";
import chronicle from "./games/chronicle.js";

const GAMES = [inkwell, quartet, clusters, comb, ladder, trace, nine, six, crowns, tide, thread, pixel,
  switchboard, triad, codebreak, equal, prime, hex, degree, scale, silhouette, overland, chronicle];
const SECTIONS = [
  ["words", "I", "Letters", "Words to find, sort, climb and trace."],
  ["logic", "II", "Logic", "Grids that only fit one way."],
  ["numbers", "III", "Numbers", "Sums, primes, angles and wild estimates."],
  ["geo", "IV", "World", "Maps and moments in time."],
];
const byId = Object.fromEntries(GAMES.map((g, i) => [g.id, { ...g, no: i + 1 }]));
const app = document.getElementById("app");
let today = dayKey();
let cleanups = [];

// ---------- helpers ----------
const rec = (id, day = today) => store.game(day, id);
const finished = (id, day = today) => ["won", "lost"].includes(rec(id, day)?.status);
const longDate = (d) => new Date(d + "T12:00:00").toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" });

function streak() {
  const d = new Date();
  const won = (k) => Object.values(store.data.days[k] || {}).some((r) => r.status === "won");
  if (!won(dayKey(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (won(dayKey(d))) { n++; d.setDate(d.getDate() - 1); }
  return n;
}

function coverSvg(g) {
  return `<svg viewBox="0 0 160 120" class="cover-art" aria-hidden="true">${g.cover()}</svg>`;
}

function stamp(status) {
  if (status === "won") return h("div", { class: "stamp" }, "Solved");
  if (status === "lost") return h("div", { class: "stamp missed" }, "Missed");
  return null;
}

// ---------- masthead ----------
function masthead(compact) {
  const done = GAMES.filter((g) => finished(g.id)).length;
  const won = GAMES.filter((g) => rec(g.id)?.status === "won").length;
  return h("header", { class: "mast" + (compact ? " compact" : "") },
    h("div", { class: "mast-meta" },
      h("span", {}, `No. ${issueNo(today)}`),
      h("span", {}, longDate(today)),
      h("span", {}, `${won} solved · ${streak()} day streak`)),
    h("a", { href: "#/", class: "mast-title" }, h("span", {}, "The Daily"), h("b", {}, "Gauntlet")),
    compact ? null : h("p", { class: "mast-sub" }, `${GAMES.length} puzzles, rebuilt from scratch, new every midnight. Ink in your answers.`),
    h("div", { class: "ledger", title: `${done} of ${GAMES.length} finished` },
      GAMES.map((g) => h("a", { href: `#/g/${g.id}`, class: "punch " + (rec(g.id)?.status || ""), title: g.name }))));
}

// ---------- home ----------
function home() {
  document.title = "The Daily Gauntlet";
  app.innerHTML = "";
  app.append(masthead(false));

  const lead = GAMES[hashStr(today) % GAMES.length];
  const leadRec = rec(lead.id);
  app.append(h("section", { class: "lead" },
    h("a", { class: `lead-card tint-${lead.tint}`, href: `#/g/${lead.id}` },
      h("div", { class: "lead-art", html: coverSvg(lead) }, stamp(leadRec?.status)),
      h("div", { class: "lead-text" },
        h("span", { class: "kicker" }, "Today's lead"),
        h("h2", {}, lead.name),
        h("p", {}, lead.blurb),
        h("span", { class: "go" }, leadRec?.status ? "See result" : "Start here")))));

  const next = GAMES.find((g) => !finished(g.id));
  if (!next) app.append(h("p", { class: "cleared" }, "Gauntlet cleared. Every puzzle is done for today. See you after midnight."));

  for (const [cat, num, title, sub] of SECTIONS) {
    const list = GAMES.filter((g) => g.cat === cat);
    app.append(h("section", { class: "section" },
      h("div", { class: "sec-head" }, h("span", { class: "sec-num" }, num), h("h2", {}, title), h("p", {}, sub)),
      h("div", { class: "cards" }, list.map(card))));
  }

  app.append(elsewhere());
  app.append(h("footer", { class: "foot" },
    h("p", {}, "Every puzzle here is generated in your browser from the date, so everyone gets the same one. Progress stays on this device."),
    h("p", {}, "Word lists: ENABLE (public domain) and frequency data from Google 10k and OpenSubtitles. Maps: Natural Earth via world-atlas.")));
}

function card(g) {
  const r = rec(g.id);
  const G = byId[g.id];
  return h("a", { class: `card tint-${g.tint}` + (r?.status ? " " + r.status : ""), href: `#/g/${g.id}` },
    h("div", { class: "card-art", html: coverSvg(g) }, stamp(r?.status)),
    h("div", { class: "card-text" },
      h("span", { class: "no" }, `No. ${String(G.no).padStart(2, "0")}`),
      h("h3", {}, g.name),
      h("p", {}, g.blurb),
      r?.summary ? h("span", { class: "result-line" }, r.summary.split("\n")[0]) : null));
}

// ---------- links to other sites ----------
let pendingLink = null;
function elsewhere() {
  const done = (store.data.links[today] ||= []);
  const sec = h("section", { class: "section elsewhere" },
    h("div", { class: "sec-head" }, h("span", { class: "sec-num" }, "V"), h("h2", {}, "Elsewhere"),
      h("p", {}, "Daily games built on films, music, photos or crowd answers. Those can't be copied, so here are the originals. Tick them off yourself.")));
  const list = h("ol", { class: "links" });
  LINKS.forEach(([id, name, url, blurb]) => {
    const on = done.includes(id);
    list.append(h("li", { class: on ? "on" : "" },
      h("button", { class: "tick", "aria-label": `Mark ${name} done`, onclick: () => toggleLink(id) }),
      h("a", { href: url, target: "_blank", rel: "noopener", onclick: () => { if (!done.includes(id)) pendingLink = id; } },
        h("b", {}, name), h("span", {}, blurb)),
      h("span", { class: "host" }, new URL(url).hostname.replace(/^www\./, ""))));
  });
  sec.append(list);
  return sec;
}

function toggleLink(id, force) {
  const done = (store.data.links[today] ||= []);
  const i = done.indexOf(id);
  const want = force ?? i === -1;
  if (want && i === -1) done.push(id);
  if (!want && i !== -1) done.splice(i, 1);
  store.save();
  route();
}

function askLink() {
  if (document.visibilityState !== "visible" || !pendingLink) return;
  const id = pendingLink;
  pendingLink = null;
  const name = LINKS.find((l) => l[0] === id)[1];
  const bar = h("div", { class: "ask" }, h("span", {}, `Back from ${name}. Done for today?`),
    h("button", { class: "btn", onclick: () => { bar.remove(); toggleLink(id, true); } }, "Yes, tick it"),
    h("button", { class: "btn ghost", onclick: () => bar.remove() }, "Not yet"));
  document.querySelector(".ask")?.remove();
  document.body.append(bar);
}
document.addEventListener("visibilitychange", askLink);
window.addEventListener("focus", () => setTimeout(askLink, 150));

// ---------- game page ----------
function play(id) {
  const g = byId[id];
  if (!g) { location.hash = "#/"; return; }
  document.title = `${g.name} · The Daily Gauntlet`;
  app.innerHTML = "";
  app.append(masthead(true));

  const r = rec(id) || {};
  const ctx = {
    day: today,
    rng: rng(`${today}:${id}`),
    state: r.data ? JSON.parse(JSON.stringify(r.data)) : null,
    status: r.status || "playing",
    save(data) { store.setGame(today, id, { ...(rec(id) || {}), status: rec(id)?.status || "playing", data }); },
    win(summary, note) { finish("won", summary, note); },
    lose(summary, note) { finish("lost", summary, note); },
    update(summary) { const cur = rec(id); store.setGame(today, id, { ...cur, summary }); showResult(); },
    cleanup(fn) { cleanups.push(fn); },
  };

  const result = h("div", { class: "result" });
  const board = h("div", { class: "board" });
  app.append(h("article", { class: `game tint-${g.tint}` },
    h("div", { class: "game-head" },
      h("a", { href: "#/", class: "back" }, "← All puzzles"),
      h("span", { class: "no" }, `No. ${String(g.no).padStart(2, "0")}`)),
    h("h1", { class: "game-title" }, g.name),
    h("details", { class: "rules", open: !r.status && !(store.data.prefs.seen ||= {})[id] }, h("summary", {}, "How to play"), h("p", { html: g.rules })),
    result, board));

  // Games that allow play after the goal (Comb, Trace) don't block input on ctx.status.
  function finish(status, summary, note) {
    ctx.status = status;
    store.setGame(today, id, { ...(rec(id) || {}), status, summary, note });
    showResult(true);
    app.querySelector(".mast")?.replaceWith(masthead(true));
  }

  function showResult(fresh) {
    const cur = rec(id);
    result.innerHTML = "";
    if (!cur || !["won", "lost"].includes(cur.status)) return;
    const next = GAMES.find((x) => !finished(x.id) && x.id !== id);
    const text = `The Daily Gauntlet No. ${issueNo(today)}\n${g.name} ${cur.summary}\n${location.origin}${location.pathname}#/g/${id}`;
    result.append(h("div", { class: "result-card " + cur.status + (fresh ? " fresh" : "") },
      stamp(cur.status),
      h("pre", {}, cur.summary),
      cur.note ? h("p", { class: "note" }, cur.note) : null,
      h("div", { class: "row-c" },
        h("button", { class: "btn ghost", onclick: () => share(text) }, "Copy result"),
        next ? h("a", { class: "btn", href: `#/g/${next.id}` }, `Next: ${next.name} →`) : h("a", { class: "btn", href: "#/" }, "Front page"))));
  }

  store.data.prefs.seen[id] = 1;
  store.save();
  showResult(false);
  try {
    const p = g.mount(board, ctx);
    if (p && p.catch) p.catch((e) => { console.error(e); board.append(h("p", { class: "label center" }, "This puzzle failed to load.")); });
  } catch (e) {
    console.error(e);
    board.append(h("p", { class: "label center" }, "This puzzle failed to load."));
  }
  window.scrollTo(0, 0);
}

async function share(text) {
  try {
    if (navigator.share && matchMedia("(pointer: coarse)").matches) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); flash("Copied"); }
  } catch { /* user cancelled */ }
}

// ---------- router ----------
function route() {
  cleanups.forEach((f) => f());
  cleanups = [];
  const m = location.hash.match(/^#\/g\/([\w-]+)/);
  const y = window.scrollY;
  if (m) play(m[1]);
  else { home(); window.scrollTo(0, y); }
}
window.addEventListener("hashchange", () => { route(); if (!location.hash.startsWith("#/g/")) window.scrollTo(0, 0); });

// New day while the page stays open.
setInterval(() => { if (dayKey() !== today) { today = dayKey(); route(); } }, 30000);

// Theme toggle (stored per device).
const applyTheme = () => {
  const t = store.data.prefs.theme;
  if (t) document.documentElement.dataset.theme = t; else delete document.documentElement.dataset.theme;
};
applyTheme();
document.getElementById("theme").onclick = () => {
  const dark = store.data.prefs.theme ? store.data.prefs.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  store.data.prefs.theme = dark ? "light" : "dark";
  store.save();
  applyTheme();
};

route();
