import type { Board, Hands, Move, Owner } from "./types";
import { pieceValues } from "./constants";
import { applyMove } from "./moves";
import { buildLegalMoves, canApplyPromotionOption, isInCheck } from "./rules";
import { evaluate } from "./eval";

export const isMoveGivingCheck = (
  board: Board,
  hands: Hands,
  owner: Owner,
  move: Move
) => {
  const next = applyMove(board, hands, move, owner);
  const opponent: Owner = owner === "w" ? "b" : "w";
  return isInCheck(next.board, opponent);
};

export const orderMoves = (
  board: Board,
  hands: Hands,
  owner: Owner,
  moves: Move[]
) =>
  [...moves].sort((a, b) => {
    const aCapture = a.from ? board[a.to.r][a.to.c] : null;
    const bCapture = b.from ? board[b.to.r][b.to.c] : null;
    const aScore = aCapture ? pieceValues[aCapture.type] : 0;
    const bScore = bCapture ? pieceValues[bCapture.type] : 0;
    const aCheck = isMoveGivingCheck(board, hands, owner, a) ? 1 : 0;
    const bCheck = isMoveGivingCheck(board, hands, owner, b) ? 1 : 0;
    if (aCheck !== bCheck) return bCheck - aCheck;
    return bScore - aScore;
  });

export const expandMovesForSearch = (
  board: Board,
  hands: Hands,
  owner: Owner,
  moves: Move[]
) => {
  const expanded: Move[] = [];
  for (const move of moves) {
    if (move.promotion === "optional") {
      if (canApplyPromotionOption(board, hands, owner, move, "must")) {
        expanded.push({ ...move, promotion: "must" });
      }
      if (canApplyPromotionOption(board, hands, owner, move, "none")) {
        expanded.push({ ...move, promotion: "none" });
      }
    } else {
      expanded.push(move);
    }
  }
  return expanded;
};

export const minimax = (
  board: Board,
  hands: Hands,
  depth: number,
  alpha: number,
  beta: number,
  maximizing: boolean
): number => {
  if (depth === 0) return evaluate(board, hands);
  const owner: Owner = maximizing ? "w" : "b";
  const legalMoves = buildLegalMoves(board, hands, owner);
  const moves = expandMovesForSearch(board, hands, owner, legalMoves);
  if (moves.length === 0) {
    if (isInCheck(board, owner)) {
      return owner === "w" ? -10000 : 10000;
    }
    return 0;
  }

  if (maximizing) {
    let value = -Infinity;
    for (const move of orderMoves(board, hands, owner, moves)) {
      const next = applyMove(board, hands, move, owner);
      const score = minimax(next.board, next.hands, depth - 1, alpha, beta, false);
      value = Math.max(value, score);
      alpha = Math.max(alpha, value);
      if (beta <= alpha) break;
    }
    return value;
  }

  let value = Infinity;
  for (const move of orderMoves(board, hands, owner, moves)) {
    const next = applyMove(board, hands, move, owner);
    const score = minimax(next.board, next.hands, depth - 1, alpha, beta, true);
    value = Math.min(value, score);
    beta = Math.min(beta, value);
    if (beta <= alpha) break;
  }
  return value;
};

export const sumMaterial = (board: Board, hands: Hands) => {
  let total = 0;
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const cell = board[r][c];
      if (!cell || cell.type === "K") continue;
      total += pieceValues[cell.type];
    }
  }
  for (const type of Object.keys(pieceValues)) {
    const piece = type as keyof typeof pieceValues;
    const count = hands.b[piece] + hands.w[piece];
    total += count * pieceValues[piece];
  }
  return total;
};

export const chooseLocalAiMove = (
  board: Board,
  hands: Hands,
  maxDepth: number,
  timeMs: number
) => {
  const legalMoves = buildLegalMoves(board, hands, "w");
  const baseMoves = expandMovesForSearch(board, hands, "w", legalMoves);
  if (baseMoves.length === 0) return null;

  const material = sumMaterial(board, hands);
  const endgame = material <= 24;
  const start = Date.now();
  let bestMove: Move | null = null;

  for (let depth = 1; depth <= maxDepth; depth += 1) {
    if (Date.now() - start > timeMs) break;
    let localBestScore = -Infinity;
    let localBestMoves: Move[] = [];
    const ordered = orderMoves(board, hands, "w", baseMoves);

    for (const move of ordered) {
      if (Date.now() - start > timeMs) break;
      const next = applyMove(board, hands, move, "w");
      const score = minimax(
        next.board,
        next.hands,
        depth - 1,
        -Infinity,
        Infinity,
        false
      );
      const bonus = endgame && isMoveGivingCheck(board, hands, "w", move) ? 0.5 : 0;
      const scored = score + bonus;
      if (scored > localBestScore) {
        localBestScore = scored;
        localBestMoves = [move];
      } else if (scored === localBestScore) {
        localBestMoves.push(move);
      }
    }

    if (localBestMoves.length > 0) {
      bestMove = localBestMoves[Math.floor(Math.random() * localBestMoves.length)];
    }
  }

  if (!bestMove) {
    const fallback = orderMoves(board, hands, "w", baseMoves);
    return fallback[0] ?? baseMoves[0];
  }
  return bestMove;
};

export const chooseAiMove = async (
  board: Board,
  hands: Hands,
  maxDepth: number,
  timeMs: number
) => {
  if (typeof window !== "undefined") {
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board,
          hands,
          turn: "w",
          depth: maxDepth,
          timeMs,
        }),
      });
      if (response.ok) {
        const data = (await response.json()) as { move?: Move | null };
        if (data.move) return data.move;
      }
    } catch {
      // ignore and fallback
    }
  }
  return chooseLocalAiMove(board, hands, maxDepth, timeMs);
};
