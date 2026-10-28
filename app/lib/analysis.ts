import type { Board, EvaluationEntry, Hands, Owner } from "./types";
import { evaluate } from "./eval";
export { squareText, describeMove, formatEvaluation } from "./notation";

export const localEvaluation = (
  board: Board,
  hands: Hands,
  ply: number,
): EvaluationEntry => ({
  ply,
  score: Math.round(-evaluate(board, hands) * 100),
  source: "local",
});

export const scoreForSente = (score: number, turn: Owner) =>
  turn === "b" ? score : -score;

export const moveQuality = (
  before: EvaluationEntry | undefined,
  after: EvaluationEntry | undefined,
  owner: Owner,
): "good" | "bad" | "neutral" => {
  if (!before || !after || before.source !== after.source) return "neutral";
  const delta = (after.score - before.score) * (owner === "b" ? 1 : -1);
  return delta >= 80 ? "good" : delta <= -80 ? "bad" : "neutral";
};
