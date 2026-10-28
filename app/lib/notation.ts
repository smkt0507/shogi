import type { Board, KifuEntry, Move, Owner } from "./types";
import { pieceLabel } from "./constants";
import { getMovePromotion } from "./moves";

export const squareText = ({ r, c }: Move["to"]) =>
  `${"１２３４５６７８９"[8 - c] ?? "?"}${"一二三四五六七八九"[r] ?? "?"}`;

export const describeMove = (board: Board, move: Move, owner: Owner) => {
  const piece = move.from ? board[move.from.r][move.from.c] : null;
  const type = move.drop ?? piece?.type;
  if (!type) return "候補手がありません";
  const label = piece?.promoted
    ? pieceLabel[type].promoted
    : pieceLabel[type].base;
  const declined =
    piece &&
    move.from &&
    move.promotion === "none" &&
    getMovePromotion(piece, move.from.r, move.to.r) === "optional";
  const suffix = move.drop
    ? "打"
    : move.promotion === "must"
      ? "成"
      : declined
        ? "不成"
        : "";
  return `${owner === "b" ? "▲" : "△"}${squareText(move.to)}${label}${suffix}`;
};

export const formatKifuEntry = (
  entry: KifuEntry,
  index: number,
  previous?: KifuEntry,
) => {
  const sameSquare =
    previous?.to.r === entry.to.r && previous.to.c === entry.to.c;
  const label = entry.promoted
    ? pieceLabel[entry.pieceType].promoted
    : pieceLabel[entry.pieceType].base;
  const suffix = entry.isDrop
    ? "打"
    : entry.promotion === "must"
      ? "成"
      : entry.optionalPromotion
        ? "不成"
        : "";
  return `${index + 1}. ${entry.owner === "b" ? "▲" : "△"}${sameSquare ? "同" : squareText(entry.to)}${label}${suffix}`;
};

export const formatEvaluation = (score: number) => {
  if (Math.abs(score) >= 90000) {
    const distance = 100000 - Math.abs(score);
    return `${score > 0 ? "先手" : "後手"}の詰み${distance > 0 ? `（${distance}手）` : ""}`;
  }
  return `${score > 0 ? "+" : ""}${score}`;
};
