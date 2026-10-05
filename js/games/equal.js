import { randInt } from "../core.js";
import { guessBoard } from "./_guess.js";

const LEN = 8;

// Tiny evaluator with * and / before + and -. Returns null for invalid input.
export function evaluate(expr) {
  if (!/^\d+([+\-*/]\d+)*$/.test(expr)) return null;
  const toks = expr.match(/\d+|[+\-*/]/g);
  if (toks.some((t) => /^0\d/.test(t))) return null;
  const terms = [+toks[0]];
  const ops = [];
  for (let i = 1; i < toks.length; i += 2) {
    const op = toks[i], n = +toks[i + 1];
    if (op === "*") terms.push(terms.pop() * n);
    else if (op === "/") { if (n === 0) return null; terms.push(terms.pop() / n); }
    else { ops.push(op); terms.push(n); }
  }
  let v = terms[0];
  ops.forEach((op, i) => (v = op === "+" ? v + terms[i + 1] : v - terms[i + 1]));
  return v;
}

export function check(eq) {
  const parts = eq.split("=");
  if (parts.length !== 2) return "Needs exactly one =";
  const [lhs, rhs] = parts;
  if (!/^\d+$/.test(rhs) || /^0\d/.test(rhs)) return "Right side must be a number";
  if (!/[+\-*/]/.test(lhs)) return "Left side needs an operator";
  const v = evaluate(lhs);
  if (v === null) return "Not a valid sum";
  if (v !== +rhs) return "That doesn't compute";
  return null;
}

export function makeAnswer(r) {
  const ops = "+-*/";
  for (;;) {
    const terms = 2 + randInt(r, 2);
    let lhs = String(1 + randInt(r, 99));
    for (let k = 1; k < terms; k++) lhs += ops[randInt(r, 4)] + (1 + randInt(r, k === 1 ? 99 : 9));
    const v = evaluate(lhs);
    if (v === null || !Number.isInteger(v) || v < 0) continue;
    const eq = `${lhs}=${v}`;
    if (eq.length === LEN && !check(eq)) return eq;
  }
}

export default {
  id: "equal",
  name: "Equal",
  cat: "numbers",
  tint: "blue",
  blurb: "Guess the hidden eight-character sum.",
  rules: `Find the hidden equation in six tries. Each guess must be a correct calculation of exactly eight
    characters, like <b>12+35=47</b>. Multiplication and division come before addition and subtraction.`,
  cover: () => [..."9*8-5=67"].map((ch, i) => {
    const s = ["correct", "absent", "present", "absent", "correct", "correct", "present", "absent"][i];
    return `<rect x="${10 + i * 18}" y="46" width="16" height="22" class="t-${s}"/>
      <text x="${18 + i * 18}" y="62" class="tl sm ${s === "absent" ? "" : "inv"}">${ch}</text>`;
  }).join("") + [0, 1, 2, 3, 4, 5, 6, 7].map((i) => `<rect x="${10 + i * 18}" y="74" width="16" height="22" class="t-empty"/>`).join(""),
  mount(root, ctx) {
    guessBoard(root, ctx, {
      length: LEN, tries: 6, answer: makeAnswer(ctx.rng),
      rows: ["1234567890", ["+", "-", "*", "/", "="], ["ENTER", "BACK"]],
      validate: check,
    });
  },
};
