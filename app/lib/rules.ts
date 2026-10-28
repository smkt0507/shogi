import type { Board, Hands, Move, Owner, Piece } from "./types";
import { applyMove, getLegalDrops, getMovesForPiece } from "./moves";
import { isMove } from "./validation";

export const opponentOf = (owner: Owner): Owner => (owner === "b" ? "w" : "b");

export const findKing = (board: Board, owner: Owner) => {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const cell = board[r][c];
      if (cell?.owner === owner && cell.type === "K") return { r, c };
    }
  }
  return null;
};

// Test attacks directly instead of allocating every pseudo-legal move.
const attacksSquare = (
  board: Board,
  piece: Piece,
  r: number,
  c: number,
  target: Move["to"],
) => {
  const dr = target.r - r;
  const dc = target.c - c;
  const ar = Math.abs(dr);
  const ac = Math.abs(dc);
  const forward = piece.owner === "b" ? -1 : 1;
  if (ar === 0 && ac === 0) return false;
  if (piece.type === "K") return ar <= 1 && ac <= 1;
  if (
    piece.type === "G" ||
    (piece.promoted && !["R", "B"].includes(piece.type))
  ) {
    return (
      (dr === forward && ac <= 1) ||
      (dr === 0 && ac === 1) ||
      (dr === -forward && dc === 0)
    );
  }
  if (piece.type === "P") return dr === forward && dc === 0;
  if (piece.type === "N") return dr === forward * 2 && ac === 1;
  if (piece.type === "S")
    return (dr === forward && ac <= 1) || (dr === -forward && ac === 1);
  let sliding = false;
  if (piece.type === "L") sliding = dc === 0 && dr * forward > 0;
  if (piece.type === "R") {
    if (piece.promoted && ar === 1 && ac === 1) return true;
    sliding = dr === 0 || dc === 0;
  }
  if (piece.type === "B") {
    if (piece.promoted && ar + ac === 1) return true;
    sliding = ar === ac;
  }
  if (!sliding) return false;
  const sr = Math.sign(dr);
  const sc = Math.sign(dc);
  for (
    let nr = r + sr, nc = c + sc;
    nr !== target.r || nc !== target.c;
    nr += sr, nc += sc
  ) {
    if (board[nr][nc]) return false;
  }
  return true;
};

export const isSquareAttacked = (
  board: Board,
  target: Move["to"],
  attacker: Owner,
) => {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      const piece = board[r][c];
      if (
        piece?.owner === attacker &&
        attacksSquare(board, piece, r, c, target)
      )
        return true;
    }
  }
  return false;
};

export const isInCheck = (board: Board, owner: Owner) => {
  const king = findKing(board, owner);
  return !king || isSquareAttacked(board, king, opponentOf(owner));
};

export const canApplyPromotionOption = (
  board: Board,
  hands: Hands,
  owner: Owner,
  move: Move,
  promotion: "must" | "none",
) =>
  !isInCheck(
    applyMove(board, hands, { ...move, promotion }, owner).board,
    owner,
  );

const leavesKingSafe = (board: Board, hands: Hands, owner: Owner, move: Move) =>
  canApplyPromotionOption(
    board,
    hands,
    owner,
    move,
    move.promotion === "none" ? "none" : "must",
  );

export const getLegalMovesForPiece = (
  board: Board,
  hands: Hands,
  owner: Owner,
  r: number,
  c: number,
) => {
  if (board[r]?.[c]?.owner !== owner) return [];
  return getMovesForPiece(board, r, c).filter(
    (move) =>
      board[move.to.r][move.to.c]?.type !== "K" &&
      leavesKingSafe(board, hands, owner, move),
  );
};

const hasLegalBoardMove = (board: Board, hands: Hands, owner: Owner) => {
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (
        board[r][c]?.owner === owner &&
        getLegalMovesForPiece(board, hands, owner, r, c).length
      )
        return true;
    }
  }
  return false;
};

const isLegalDrop = (board: Board, hands: Hands, owner: Owner, move: Move) => {
  const next = applyMove(board, hands, move, owner);
  if (isInCheck(next.board, owner)) return false;
  if (move.drop !== "P") return true;
  const opponent = opponentOf(owner);
  const king = findKing(next.board, opponent);
  const pawnAttacksKing =
    king &&
    king.c === move.to.c &&
    king.r === move.to.r + (owner === "b" ? -1 : 1);
  // A direct pawn check cannot be blocked by a drop. Only board moves can escape.
  return (
    !pawnAttacksKing || hasLegalBoardMove(next.board, next.hands, opponent)
  );
};

export const getLegalDropMoves = (board: Board, hands: Hands, owner: Owner) =>
  getLegalDrops(board, hands, owner).filter((move) =>
    isLegalDrop(board, hands, owner, move),
  );

export const hasLegalMove = (board: Board, hands: Hands, owner: Owner) =>
  hasLegalBoardMove(board, hands, owner) ||
  getLegalDrops(board, hands, owner).some((move) =>
    isLegalDrop(board, hands, owner, move),
  );

export const buildLegalMoves = (board: Board, hands: Hands, owner: Owner) => {
  const moves: Move[] = [];
  for (let r = 0; r < 9; r += 1) {
    for (let c = 0; c < 9; c += 1) {
      if (board[r][c]?.owner === owner)
        moves.push(...getLegalMovesForPiece(board, hands, owner, r, c));
    }
  }
  moves.push(...getLegalDropMoves(board, hands, owner));
  return moves;
};

// Validate external moves against the rules before applying them to the board.
export const resolveLegalMove = (
  board: Board,
  hands: Hands,
  owner: Owner,
  value: unknown,
): Move | null => {
  if (!isMove(value) || value.promotion === "optional") return null;
  const moves = value.drop
    ? getLegalDropMoves(board, hands, owner)
    : getLegalMovesForPiece(board, hands, owner, value.from!.r, value.from!.c);
  const legal = moves.find(
    (move) =>
      move.to.r === value.to.r &&
      move.to.c === value.to.c &&
      move.drop === value.drop &&
      (move.promotion === "optional" || move.promotion === value.promotion),
  );
  return legal ? { ...legal, promotion: value.promotion } : null;
};

export const isMoveLegal = (
  board: Board,
  hands: Hands,
  owner: Owner,
  move: Move,
) => resolveLegalMove(board, hands, owner, move) !== null;
