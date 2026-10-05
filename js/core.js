// Shared helpers: seeded randomness, dates, storage, DOM, on-screen keyboard.

export const LAUNCH = "2026-10-05";

export function dayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function issueNo(day) {
  const ms = new Date(day + "T12:00:00") - new Date(LAUNCH + "T12:00:00");
  return Math.round(ms / 86400000) + 1;
}

export function hashStr(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return (h2 >>> 0) ^ (h1 >>> 0);
}

// mulberry32: small, fast, good enough for puzzle generation.
export function rng(seed) {
  let a = typeof seed === "string" ? hashStr(seed) : seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (r, n) => Math.floor(r() * n);
export const pick = (r, arr) => arr[randInt(r, arr.length)];
export function shuffle(r, arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(r, i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- persistence ----
const KEY = "gauntlet:v2";
export const store = (() => {
  let data = {};
  try { data = JSON.parse(localStorage.getItem(KEY)) || {}; } catch {}
  data.days ||= {};
  data.links ||= {};
  data.prefs ||= {};
  return {
    data,
    save() { try { localStorage.setItem(KEY, JSON.stringify(data)); } catch {} },
    game(day, id) { return (data.days[day] ||= {})[id]; },
    setGame(day, id, rec) { (data.days[day] ||= {})[id] = rec; this.save(); },
  };
})();

// ---- DOM ----
export function h(tag, attrs = {}, ...kids) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style" && typeof v === "object") {
      // Custom properties (--x) only work through setProperty.
      for (const [p, val] of Object.entries(v)) p.startsWith("--") ? el.style.setProperty(p, val) : (el.style[p] = val);
    }
    else if (k.startsWith("on")) el.addEventListener(k.slice(2), v);
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const kid of kids.flat()) {
    if (kid == null || kid === false) continue;
    el.append(kid instanceof Node ? kid : document.createTextNode(String(kid)));
  }
  return el;
}

export function flash(msg, ms = 1600) {
  let t = document.querySelector(".flash");
  if (!t) { t = h("div", { class: "flash", role: "status" }); document.body.append(t); }
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove("show"), ms);
}

export function shake(el) {
  el.classList.remove("shake");
  void el.offsetWidth;
  el.classList.add("shake");
}

// On-screen keyboard that also listens to the physical keyboard.
// rows: array of strings; special keys "ENTER" and "BACK".
export function keyboard(rows, onKey, ctx) {
  const keys = {};
  const wrap = h("div", { class: "kb" },
    rows.map((row) => h("div", { class: "kb-row" },
      (Array.isArray(row) ? row : row.split("")).map((k) => {
        const label = k === "BACK" ? "Del" : k === "ENTER" ? "Enter" : k;
        const b = h("button", { class: "key" + (k.length > 1 ? " wide" : ""), type: "button", onclick: () => onKey(k) }, label);
        keys[k] = b;
        return b;
      }))));
  const onDown = (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.target.closest && e.target.closest("input, textarea")) return;
    let k = e.key;
    if (k === "Enter") k = "ENTER";
    else if (k === "Backspace") k = "BACK";
    else k = k.length === 1 ? k.toUpperCase() : null;
    if (k && (keys[k] || keys[k.toLowerCase()])) { e.preventDefault(); onKey(keys[k] ? k : k.toLowerCase()); }
  };
  document.addEventListener("keydown", onDown);
  ctx.cleanup(() => document.removeEventListener("keydown", onDown));
  return {
    el: wrap,
    mark(k, state) {
      const b = keys[k]; if (!b) return;
      const rank = { absent: 1, present: 2, correct: 3 };
      if ((rank[state] || 0) > (rank[b.dataset.state] || 0)) b.dataset.state = state;
    },
  };
}

// Standard two-pass feedback for guess-the-sequence games.
export function score(guess, answer) {
  const res = Array(guess.length).fill("absent");
  const left = {};
  for (let i = 0; i < answer.length; i++) {
    if (guess[i] === answer[i]) res[i] = "correct";
    else left[answer[i]] = (left[answer[i]] || 0) + 1;
  }
  for (let i = 0; i < guess.length; i++) {
    if (res[i] !== "correct" && left[guess[i]] > 0) { res[i] = "present"; left[guess[i]]--; }
  }
  return res;
}

export const marks = { correct: "■", present: "▣", absent: "□" };
