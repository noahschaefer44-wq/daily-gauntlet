# The Daily Gauntlet

23 daily puzzles, rebuilt from scratch, in one newspaper-style page. New puzzles every midnight.

Live: https://noahschaefer44-wq.github.io/daily-gauntlet/

| Section | Puzzles |
| --- | --- |
| Letters | Inkwell (five-letter word), Quartet (four words at once), Clusters (four hidden groups), Comb (seven-letter hive), Ladder (word ladder), Trace (letter grid) |
| Logic | Nine (sudoku), Six (6×6 sudoku), Crowns (one crown per row, column and region), Tide (suns and moons), Thread (one line through every cell), Pixel (nonogram), Switchboard (lights out), Triad (find six triads), Codebreak (colour code) |
| Numbers | Equal (guess the sum), Prime (five-digit prime), Hex (colour hex code), Degree (estimate an angle), Scale (orders of magnitude) |
| World | Silhouette (country outline), Overland (connect two countries by land), Chronicle (order historical events) |

There is also an **Elsewhere** list of games that depend on film, music, photos or crowd answers (Krillion, Framed, GeoGuessr and more). These link to the original sites, and you tick them off by hand.

## How it works

- Every puzzle is generated in the browser from the date, so everyone gets the same puzzle on the same day.
- A finished puzzle is stamped **Solved** automatically. Progress, streaks and the punch-card ledger are stored in `localStorage`.
- Logic puzzles (Nine, Six, Crowns, Tide) are checked for a unique solution when generated.
- Plain HTML, CSS and ES modules. No build step. Serve the folder with any static server.

## Adding a game

Create `js/games/<id>.js` that exports `{ id, name, cat, tint, blurb, rules, cover(), mount(root, ctx) }` and add it to `GAMES` in `js/main.js`. `ctx` gives a seeded `rng`, saved `state`, `save()`, `win()`, `lose()` and `cleanup()`.

## Data

- Words: ENABLE word list (public domain), filtered with Google 10k and OpenSubtitles frequency lists (hermitdave/FrequencyWords).
- Maps: Natural Earth via `world-atlas`, rendered with `d3-geo` and `topojson-client`.
