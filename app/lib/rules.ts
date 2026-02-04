import type { Board, Hands, Move, Owner } from "./types";
import { applyMove, getLegalDrops, getMovesForPiece } from "./moves";

export const findKing = (board: Board, owner: Owner) => {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const cell = board[r][c];
      if (cell && cell.owner === owner && cell.type === "K") return { r, c };
    }
  }
  return null;
};

export const isSquareAttacked = (
  board: Board,
  target: { r: number; c: number },
  attacker: Owner
) => {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const cell = board[r][c];
      if (!cell || cell.owner !== attacker) continue;
      const moves = getMovesForPiece(board, r, c);
      if (moves.some((move) => move.to.r === target.r && move.to.c === target.c)) {
        return true;
      }
    }
  }
  return false;
};

export const isInCheck = (board: Board, owner: Owner) => {
  const king = findKing(board, owner);
  if (!king) return true;
  const attacker: Owner = owner === "b" ? "w" : "b";
  return isSquareAttacked(board, king, attacker);
};

export const canApplyPromotionOption = (
  board: Board,
  hands: Hands,
  owner: Owner,
  move: Move,
  promotion: "must" | "none"
) => {
  const next = applyMove(board, hands, { ...move, promotion }, owner);
  return !isInCheck(next.board, owner);
};

export const isMoveLegal = (board: Board, hands: Hands, owner: Owner, move: Move) => {
  if (move.promotion === "optional") {
    return (
      canApplyPromotionOption(board, hands, owner, move, "must") ||
      canApplyPromotionOption(board, hands, owner, move, "none")
    );
  }
  return canApplyPromotionOption(board, hands, owner, move, move.promotion);
};

export const getLegalMovesForPiece = (
  board: Board,
  hands: Hands,
  owner: Owner,
  r: number,
  c: number
) => getMovesForPiece(board, r, c).filter((move) => isMoveLegal(board, hands, owner, move));

export const getLegalDropMoves = (board: Board, hands: Hands, owner: Owner) =>
  getLegalDrops(board, hands, owner).filter((move) => isMoveLegal(board, hands, owner, move));

export const buildLegalMoves = (board: Board, hands: Hands, owner: Owner) => {
  const moves: Move[] = [];
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const cell = board[r][c];
      if (!cell || cell.owner !== owner) continue;
      moves.push(...getLegalMovesForPiece(board, hands, owner, r, c));
    }
  }
  moves.push(...getLegalDropMoves(board, hands, owner));
  return moves;
};
