import { sudokuGame } from "./_sudoku.js";

export default {
  id: "nine",
  name: "Nine",
  cat: "logic",
  tint: "paper",
  blurb: "The classic 9×9 number place.",
  rules: `Fill every row, column and 3×3 box with the digits 1 to 9, each exactly once.
    Use the pencil for notes. Arrow keys and number keys work too.`,
  cover: () => {
    let s = `<rect x="35" y="5" width="90" height="90" class="t-card"/>`;
    for (let i = 1; i < 9; i++) s += `<line x1="${35 + i * 10}" y1="5" x2="${35 + i * 10}" y2="95" class="${i % 3 ? "thin" : "thick"}"/>
      <line x1="35" y1="${5 + i * 10}" x2="125" y2="${5 + i * 10}" class="${i % 3 ? "thin" : "thick"}"/>`;
    const d = [[0, 0, 5], [1, 3, 7], [2, 7, 3], [3, 1, 9], [4, 4, 1], [5, 8, 6], [6, 2, 2], [7, 5, 8], [8, 6, 4], [0, 5, 2], [4, 7, 5]];
    return s + d.map(([r, c, v]) => `<text x="${40 + c * 10}" y="${13 + r * 10}" class="tl xs">${v}</text>`).join("")
      + `<text x="80" y="114" class="tl xs soft">9 × 9</text>`;
  },
  mount(root, ctx) { sudokuGame(root, ctx, 9, 30); },
};
