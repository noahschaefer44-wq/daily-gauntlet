import { sudokuGame } from "./_sudoku.js";

export default {
  id: "six",
  name: "Six",
  cat: "logic",
  tint: "green",
  blurb: "A pocket 6×6 sudoku for a fast start.",
  rules: `Fill every row, column and 2×3 box with the digits 1 to 6, each exactly once.`,
  cover: () => {
    let s = `<rect x="44" y="12" width="72" height="72" class="t-card"/>`;
    for (let i = 1; i < 6; i++) s += `<line x1="${44 + i * 12}" y1="12" x2="${44 + i * 12}" y2="84" class="${i === 3 ? "thick" : "thin"}"/>
      <line x1="44" y1="${12 + i * 12}" x2="116" y2="${12 + i * 12}" class="${i % 2 ? "thin" : "thick"}"/>`;
    const d = [[0, 1, 4], [1, 4, 2], [2, 0, 6], [3, 3, 1], [4, 5, 3], [5, 2, 5], [2, 4, 4]];
    return s + d.map(([r, c, v]) => `<text x="${50 + c * 12}" y="${22 + r * 12}" class="tl xs">${v}</text>`).join("")
      + `<text x="80" y="108" class="tl xs soft">6 × 6</text>`;
  },
  mount(root, ctx) { sudokuGame(root, ctx, 6, 13); },
};
