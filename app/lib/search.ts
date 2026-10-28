import type { Board, Hands, Move, Owner } from "./types";
import { pieceValues } from "./constants";
import { applyMove } from "./moves";
import { buildLegalMoves, hasLegalMove, isInCheck } from "./rules";
import { evaluate } from "./eval";

const SEARCH_TIMEOUT = Symbol("search timeout");

export const isMoveGivingCheck = (
  board: Board,
  hands: Hands,
  owner: Owner,
  move: Move,
) => {
  const next = applyMove(board, hands, move, owner);
  const opponent: Owner = owner === "w" ? "b" : "w";
  return isInCheck(next.board, opponent);
};

export const orderMoves = (
  board: Board,
  hands: Hands,
  owner: Owner,
  moves: Move[],
) =>
  moves
    .map((move) => {
      const captured = move.from ? board[move.to.r][move.to.c] : null;
      return {
        move,
        score:
          (isMoveGivingCheck(board, hands, owner, move) ? 1000 : 0) +
          (captured ? pieceValues[captured.type] : 0),
      };
    })
    .sort((a, b) => b.score - a.score)
    .map(({ move }) => move);

// Input moves have already passed the king-safety check; promotion does not
// change occupancy or expose the mover's king, so no second legality pass is needed.
export const expandMovesForSearch = (
  _board: Board,
  _hands: Hands,
  _owner: Owner,
  moves: Move[],
) =>
  moves.flatMap((move): Move[] =>
    move.promotion === "optional"
      ? [
          { ...move, promotion: "must" },
          { ...move, promotion: "none" },
        ]
      : [move],
  );

export const minimax = (
  board: Board,
  hands: Hands,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean,
  deadline = Infinity,
): number => {
  if (Date.now() >= deadline) throw SEARCH_TIMEOUT;
  const owner: Owner = maximizing ? "w" : "b";
  if (depth === 0) {
    if (isInCheck(board, owner) && !hasLegalMove(board, hands, owner))
      return maximizing ? -10000 : 10000;
    return evaluate(board, hands);
  }
  const legalMoves = buildLegalMoves(board, hands, owner);
  const moves = expandMovesForSearch(board, hands, owner, legalMoves);
  if (moves.length === 0) {
    return maximizing ? -10000 : 10000;
  }

  if (maximizing) {
    let value = -Infinity;
    for (const move of orderMoves(board, hands, owner, moves)) {
      const next = applyMove(board, hands, move, owner);
      const score = minimax(
        next.board,
        next.hands,
        depth - 1,
        alpha,
        beta,
        false,
        deadline,
      );
      value = Math.max(value, score);
      alpha = Math.max(alpha, value);
      if (beta <= alpha) break;
    }
    return value;
  }

  let value = Infinity;
  for (const move of orderMoves(board, hands, owner, moves)) {
    const next = applyMove(board, hands, move, owner);
    const score = minimax(
      next.board,
      next.hands,
      depth - 1,
      alpha,
      beta,
      true,
      deadline,
    );
    value = Math.min(value, score);
    beta = Math.min(beta, value);
    if (beta <= alpha) break;
  }
  return value;
};

export const chooseLocalAiMove = (
  board: Board,
  hands: Hands,
  maxDepth: number,
  timeMs: number,
  owner: Owner = "w",
): Move | null => {
  const deadline = Date.now() + timeMs;
  const baseMoves = expandMovesForSearch(
    board,
    hands,
    owner,
    buildLegalMoves(board, hands, owner),
  );
  if (!baseMoves.length) return null;
  const direction = owner === "w" ? 1 : -1;
  let bestMove = baseMoves[0];
  let ordered = orderMoves(board, hands, owner, baseMoves);
  for (let depth = 1; depth <= maxDepth; depth += 1) {
    let localBest = bestMove;
    let bestScore = -Infinity;
    let alpha = -Infinity;
    let beta = Infinity;
    let completed = true;
    for (const move of ordered) {
      if (Date.now() >= deadline) {
        completed = false;
        break;
      }
      const next = applyMove(board, hands, move, owner);
      try {
        const score = minimax(
          next.board,
          next.hands,
          depth - 1,
          alpha,
          beta,
          owner === "b",
          deadline,
        );
        if (score * direction > bestScore) {
          bestScore = score * direction;
          localBest = move;
        }
        if (owner === "w") alpha = Math.max(alpha, score);
        else beta = Math.min(beta, score);
      } catch (error) {
        if (error !== SEARCH_TIMEOUT) throw error;
        completed = false;
        break;
      }
    }
    // Never replace a completed iteration with a partially searched deeper one.
    if (completed) bestMove = localBest;
    else break;
    ordered = [bestMove, ...ordered.filter((move) => move !== bestMove)];
  }
  return bestMove;
};
