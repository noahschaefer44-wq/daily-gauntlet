(() => {
  const KEY = "dg:v1";
  const $ = (id) => document.getElementById(id);

  // ---- storage ----
  const load = () => {
    try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch { return {}; }
  };
  const state = Object.assign({ history: {}, played: {}, favs: [], filter: "All", hideSolved: false, favOnly: false, theme: null }, load());
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {} };

  const dayKey = (d = new Date()) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  let today = dayKey();
  const solvedToday = () => (state.history[today] ||= []);
  const playedToday = () => (state.played[today] ||= []);

  // Drop "played" markers from earlier days; keep solve history for streaks.
  const prune = () => { for (const k of Object.keys(state.played)) if (k !== today) delete state.played[k]; };
  prune();

  // ---- theme ----
  const applyTheme = () => {
    if (state.theme) document.documentElement.dataset.theme = state.theme;
    else delete document.documentElement.dataset.theme;
  };
  applyTheme();
  $("themeBtn").onclick = () => {
    const dark = state.theme ? state.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
    state.theme = dark ? "light" : "dark";
    applyTheme(); save();
  };

  // ---- covers ----
  const hash = (s) => [...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  const shade = (hex, amt) => {
    const n = parseInt(hex.slice(1), 16);
    const f = (v) => Math.max(0, Math.min(255, Math.round(v + amt)));
    return `rgb(${f(n >> 16)}, ${f((n >> 8) & 255)}, ${f(n & 255)})`;
  };
  const patterns = [
    '<pattern id="P" width="22" height="22" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="2.4" fill="#fff"/></pattern>',
    '<pattern id="P" width="18" height="18" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="6" height="18" fill="#fff"/></pattern>',
    '<pattern id="P" width="26" height="26" patternUnits="userSpaceOnUse"><path d="M26 0H0V26" fill="none" stroke="#fff" stroke-width="2"/></pattern>',
    '<pattern id="P" width="30" height="30" patternUnits="userSpaceOnUse"><circle cx="15" cy="15" r="9" fill="none" stroke="#fff" stroke-width="2"/></pattern>',
    '<pattern id="P" width="24" height="24" patternUnits="userSpaceOnUse"><path d="M0 12 12 0 24 12 12 24Z" fill="none" stroke="#fff" stroke-width="2"/></pattern>',
  ];
  const cover = (g) => {
    const p = patterns[hash(g.id) % patterns.length].replace(/id="P"/, `id="p-${g.id}"`);
    return `
      <svg class="pattern" width="100%" height="100%" aria-hidden="true"><defs>${p}</defs><rect width="100%" height="100%" fill="url(#p-${g.id})"/></svg>
      <span class="cat">${g.cat}</span>
      <span class="glyph">${g.emoji}</span>
      <span class="name">${g.name}</span>`;
  };

  // ---- filters ----
  const cats = ["All", ...new Set(GAMES.map((g) => g.cat))];
  const chipLabel = { Words: "Words", Logic: "Logic & Numbers", Trivia: "Trivia", Geo: "Geo & Time", Media: "Movies & Music" };
  $("chips").innerHTML = cats
    .map((c) => `<button class="chip" data-cat="${c}">${chipLabel[c] || c}</button>`).join("");
  $("chips").onclick = (e) => {
    const c = e.target.closest(".chip"); if (!c) return;
    state.filter = c.dataset.cat; save(); render();
  };
  $("hideSolved").checked = state.hideSolved;
  $("favOnly").checked = state.favOnly;
  $("hideSolved").onchange = (e) => { state.hideSolved = e.target.checked; save(); render(); };
  $("favOnly").onchange = (e) => { state.favOnly = e.target.checked; save(); render(); };
  $("search").oninput = render;

  // ---- actions ----
  const toggleSolved = (id, force) => {
    const list = solvedToday();
    const i = list.indexOf(id);
    const want = force ?? i === -1;
    if (want && i === -1) list.push(id);
    if (!want && i !== -1) list.splice(i, 1);
    save(); render();
  };

  let pending = null;
  $("grid").addEventListener("click", (e) => {
    const card = e.target.closest(".card"); if (!card) return;
    const id = card.dataset.id;
    if (e.target.closest(".check")) return toggleSolved(id);
    if (e.target.closest(".fav")) {
      const i = state.favs.indexOf(id);
      i === -1 ? state.favs.push(id) : state.favs.splice(i, 1);
      save(); return render();
    }
    if (e.target.closest("a")) {
      if (!playedToday().includes(id)) playedToday().push(id);
      if (!solvedToday().includes(id)) pending = id;
      save(); render();
    }
  });

  // When the user comes back from a game tab, ask whether it got solved.
  const askPending = () => {
    if (document.visibilityState !== "visible" || !pending) return;
    const g = GAMES.find((x) => x.id === pending);
    $("toastText").textContent = `Did you solve ${g.name}?`;
    $("toast").hidden = false;
    $("toast").dataset.id = pending;
    pending = null;
  };
  document.addEventListener("visibilitychange", askPending);
  window.addEventListener("focus", () => setTimeout(askPending, 150));
  $("toastYes").onclick = () => { toggleSolved($("toast").dataset.id, true); $("toast").hidden = true; };
  $("toastNo").onclick = () => { $("toast").hidden = true; };

  // ---- streak ----
  const streak = () => {
    const d = new Date();
    if (!(state.history[dayKey(d)] || []).length) d.setDate(d.getDate() - 1);
    let n = 0;
    while ((state.history[dayKey(d)] || []).length) { n++; d.setDate(d.getDate() - 1); }
    return n;
  };

  // ---- render ----
  function render() {
    const q = $("search").value.trim().toLowerCase();
    const solved = solvedToday(), played = playedToday();
    document.querySelectorAll(".chip").forEach((c) => c.classList.toggle("on", c.dataset.cat === state.filter));

    const list = GAMES.filter((g) =>
      (state.filter === "All" || g.cat === state.filter) &&
      (!q || (g.name + " " + g.blurb + " " + g.cat).toLowerCase().includes(q)) &&
      (!state.hideSolved || !solved.includes(g.id)) &&
      (!state.favOnly || state.favs.includes(g.id))
    ).sort((a, b) => (state.favs.includes(b.id) - state.favs.includes(a.id)));

    $("grid").innerHTML = list.length ? list.map((g) => {
      const done = solved.includes(g.id);
      const fav = state.favs.includes(g.id);
      const bg = `linear-gradient(135deg, ${shade(g.color, 25)}, ${shade(g.color, -45)})`;
      return `
      <article class="card${done ? " done" : ""}${played.includes(g.id) ? " played" : ""}" data-id="${g.id}">
        <a class="cover" href="${g.url}" target="_blank" rel="noopener" style="background:${bg}">${cover(g)}</a>
        <div class="body">
          <p class="blurb">${g.blurb}</p>
          <div class="actions">
            <a class="play" href="${g.url}" target="_blank" rel="noopener">Play</a>
            <button class="fav${fav ? " on" : ""}" title="Favorite" aria-label="Favorite ${g.name}">${fav ? "★" : "☆"}</button>
            <button class="check" title="Mark solved" aria-label="Mark ${g.name} solved">✓</button>
          </div>
        </div>
      </article>`;
    }).join("") : `<p class="empty">No puzzles match. Try another filter.</p>`;

    const solvedValid = solved.filter((id) => GAMES.some((g) => g.id === id)).length;
    $("solvedCount").textContent = `${solvedValid}/${GAMES.length}`;
    $("bar").style.width = `${(solvedValid / GAMES.length) * 100}%`;
    $("streak").textContent = streak();
    $("date").textContent = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  }

  // New day while the tab stays open: reset view.
  setInterval(() => {
    if (dayKey() !== today) { today = dayKey(); prune(); save(); render(); }
  }, 60000);

  render();
})();
