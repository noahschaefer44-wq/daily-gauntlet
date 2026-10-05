import { pick } from "../core.js";
import { ANSWERS5, VALID5 } from "../data/words.js";
import { guessBoard } from "./_guess.js";

const valid = new Set(VALID5);
const QWERTY = ["QWERTYUIOP", "ASDFGHJKL", ["ENTER", ..."ZXCVBNM", "BACK"]];

export default {
  id: "inkwell",
  name: "Inkwell",
  cat: "words",
  tint: "green",
  blurb: "One hidden five-letter word. Six tries.",
  rules: `Guess the hidden five-letter word in six tries. After each guess the tiles show
    <b class="c-correct">right letter, right spot</b>, <b class="c-present">right letter, wrong spot</b>
    or a letter that is not in the word.`,
  cover: () => `
    ${[["I","correct"],["N","absent"],["K","present"],["E","absent"],["D","correct"]].map(([l,s],i)=>
      `<rect x="${12+i*28}" y="44" width="24" height="24" class="t-${s}"/>
       <text x="${24+i*28}" y="62" class="tl ${s==="absent"?"":"inv"}">${l}</text>`).join("")}
    ${[0,1,2,3,4].map(i=>`<rect x="${12+i*28}" y="74" width="24" height="24" class="t-empty"/>`).join("")}
    ${[0,1,2,3,4].map(i=>`<rect x="${12+i*28}" y="14" width="24" height="24" class="t-absent"/>`).join("")}`,
  mount(root, ctx) {
    const answer = pick(ctx.rng, ANSWERS5).toUpperCase();
    guessBoard(root, ctx, {
      length: 5, tries: 6, answer, rows: QWERTY,
      validate: (g) => (valid.has(g.toLowerCase()) ? null : "Not in word list"),
    });
  },
};
