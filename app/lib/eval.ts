import type { Board, Hands } from "./types";
import { pieceSquare, pieceValues, promotedBonus, handOrder } from "./constants";
import { getMovesForPiece } from "./moves";
import { isInCheck } from "./rules";

export const evaluate = (board: Board, hands: Hands): number => {
  let score = 0;
  let mobilityW = 0;
  let mobilityB = 0;
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const cell = board[r][c];
      if (!cell) continue;
      const base = pieceValues[cell.type];
      const bonus = cell.promoted ? promotedBonus[cell.type] : 0;
      const table = pieceSquare[cell.type];
      const tableValue = cell.owner === "w" ? table[8 - r][8 - c] : table[r][c];
      const pieceScore = base + bonus + tableValue * 0.1;
      score += (cell.owner === "w" ? 1 : -1) * pieceScore;

      const pseudoMoves = getMovesForPiece(board, r, c);
      if (cell.owner === "w") {
        mobilityW += pseudoMoves.length;
      } else {
        mobilityB += pseudoMoves.length;
      }
    }
  }
  for (const type of handOrder) {
    score += hands.w[type] * pieceValues[type] * 0.9;
    score -= hands.b[type] * pieceValues[type] * 0.9;
  }
  score += (mobilityW - mobilityB) * 0.05;
  if (isInCheck(board, "w")) score -= 0.8;
  if (isInCheck(board, "b")) score += 0.8;
  return score;
};
