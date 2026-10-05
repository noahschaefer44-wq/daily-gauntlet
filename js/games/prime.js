import { randInt } from "../core.js";
import { guessBoard } from "./_guess.js";

export const isPrime = (n) => {
  if (n < 2) return false;
  for (let d = 2; d * d <= n; d++) if (n % d === 0) return false;
  return true;
};

export default {
  id: "prime",
  name: "Prime",
  cat: "numbers",
  tint: "red",
  blurb: "A five-digit prime. Six tries.",
  rules: `Guess the hidden five-digit prime number. Every guess must itself be a five-digit prime.
    Digits light up like letters in a word game.`,
  cover: () => [..."10007"].map((d, i) => `<rect x="${22 + i * 24}" y="34" width="20" height="26" class="t-${i % 2 ? "present" : "correct"}"/>
      <text x="${32 + i * 24}" y="52" class="tl inv">${d}</text>`).join("")
    + `<text x="80" y="92" class="tl xs soft">2 3 5 7 11 13 17 19 …</text>`,
  mount(root, ctx) {
    let n;
    do n = 10000 + randInt(ctx.rng, 90000); while (!isPrime(n));
    guessBoard(root, ctx, {
      length: 5, tries: 6, answer: String(n),
      rows: ["12345", "67890", ["ENTER", "BACK"]],
      validate: (g) => (g[0] !== "0" && isPrime(+g) ? null : "Not a five-digit prime"),
    });
  },
};
