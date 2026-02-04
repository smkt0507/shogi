import type { Board, Hands, Move, Owner, Piece, PieceType } from "./types";
import { handOrder } from "./constants";
import { cloneBoard, cloneHands } from "./board";

export const inPromotionZone = (owner: Owner, row: number) =>
  owner === "b" ? row <= 2 : row >= 6;

export const canPromote = (piece: Piece) =>
  piece.type !== "K" && piece.type !== "G" && !piece.promoted;

export const mustPromote = (piece: Piece, toRow: number) => {
  if (piece.promoted) return false;
  if (piece.owner === "b") {
    if ((piece.type === "P" || piece.type === "L") && toRow === 0) return true;
    if (piece.type === "N" && toRow <= 1) return true;
  } else {
    if ((piece.type === "P" || piece.type === "L") && toRow === 8) return true;
    if (piece.type === "N" && toRow >= 7) return true;
  }
  return false;
};

export const isInside = (r: number, c: number) =>
  r >= 0 && r < 9 && c >= 0 && c < 9;

export const getMovePromotion = (piece: Piece, fromRow: number, toRow: number) => {
  if (!canPromote(piece)) return "none" as const;
  const eligible =
    inPromotionZone(piece.owner, fromRow) || inPromotionZone(piece.owner, toRow);
  if (!eligible) return "none" as const;
  return mustPromote(piece, toRow) ? "must" : "optional";
};

export const pushMove = (
  moves: Move[],
  piece: Piece,
  from: { r: number; c: number },
  to: { r: number; c: number }
) => {
  const promotion = getMovePromotion(piece, from.r, to.r);
  moves.push({ from, to, promotion });
};

export const getMovesForPiece = (board: Board, r: number, c: number): Move[] => {
  const piece = board[r][c];
  if (!piece) return [];
  const dir = piece.owner === "b" ? -1 : 1;
  const moves: Move[] = [];
  const from = { r, c };

  const tryStep = (dr: number, dc: number) => {
    const nr = r + dr;
    const nc = c + dc;
    if (!isInside(nr, nc)) return;
    const target = board[nr][nc];
    if (target && target.owner === piece.owner) return;
    pushMove(moves, piece, from, { r: nr, c: nc });
  };

  const trySlide = (dr: number, dc: number) => {
    let nr = r + dr;
    let nc = c + dc;
    while (isInside(nr, nc)) {
      const target = board[nr][nc];
      if (target) {
        if (target.owner !== piece.owner) {
          pushMove(moves, piece, from, { r: nr, c: nc });
        }
        break;
      }
      pushMove(moves, piece, from, { r: nr, c: nc });
      nr += dr;
      nc += dc;
    }
  };

  const goldMoves = () => {
    const steps = [
      [dir, -1],
      [dir, 0],
      [dir, 1],
      [0, -1],
      [0, 1],
      [-dir, 0],
    ];
    steps.forEach(([dr, dc]) => tryStep(dr, dc));
  };

  if (piece.type === "K") {
    const steps = [
      [-1, -1],
      [-1, 0],
      [-1, 1],
      [0, -1],
      [0, 1],
      [1, -1],
      [1, 0],
      [1, 1],
    ];
    steps.forEach(([dr, dc]) => tryStep(dr, dc));
    return moves;
  }

  if (piece.promoted) {
    if (piece.type === "R") {
      trySlide(1, 0);
      trySlide(-1, 0);
      trySlide(0, 1);
      trySlide(0, -1);
      [
        [-1, -1],
        [-1, 1],
        [1, -1],
        [1, 1],
      ].forEach(([dr, dc]) => tryStep(dr, dc));
      return moves;
    }
    if (piece.type === "B") {
      trySlide(1, 1);
      trySlide(1, -1);
      trySlide(-1, 1);
      trySlide(-1, -1);
      [
        [-1, 0],
        [1, 0],
        [0, -1],
        [0, 1],
      ].forEach(([dr, dc]) => tryStep(dr, dc));
      return moves;
    }
    goldMoves();
    return moves;
  }

  switch (piece.type) {
    case "P":
      tryStep(dir, 0);
      break;
    case "L":
      trySlide(dir, 0);
      break;
    case "N":
      [
        [dir * 2, -1],
        [dir * 2, 1],
      ].forEach(([dr, dc]) => tryStep(dr, dc));
      break;
    case "S":
      [
        [dir, -1],
        [dir, 0],
        [dir, 1],
        [-dir, -1],
        [-dir, 1],
      ].forEach(([dr, dc]) => tryStep(dr, dc));
      break;
    case "G":
      goldMoves();
      break;
    case "B":
      trySlide(1, 1);
      trySlide(1, -1);
      trySlide(-1, 1);
      trySlide(-1, -1);
      break;
    case "R":
      trySlide(1, 0);
      trySlide(-1, 0);
      trySlide(0, 1);
      trySlide(0, -1);
      break;
    default:
      break;
  }

  return moves;
};

export const demote = (piece: Piece): PieceType => {
  if (piece.type === "K") return "K";
  return piece.type;
};

export const getLegalDrops = (board: Board, hands: Hands, owner: Owner): Move[] => {
  const moves: Move[] = [];
  const hand = hands[owner];
  const hasUnpromotedPawnInFile = (file: number) => {
    for (let r = 0; r < 9; r += 1) {
      const cell = board[r][file];
      if (cell && cell.owner === owner && cell.type === "P" && !cell.promoted) {
        return true;
      }
    }
    return false;
  };

  for (const type of handOrder) {
    if (hand[type] <= 0) continue;
    for (let r = 0; r < 9; r += 1) {
      for (let c = 0; c < 9; c += 1) {
        if (board[r][c]) continue;
        if (type === "P") {
          if (hasUnpromotedPawnInFile(c)) continue;
          if ((owner === "b" && r === 0) || (owner === "w" && r === 8)) continue;
        }
        if (type === "L") {
          if ((owner === "b" && r === 0) || (owner === "w" && r === 8)) continue;
        }
        if (type === "N") {
          if ((owner === "b" && r <= 1) || (owner === "w" && r >= 7)) continue;
        }
        moves.push({ to: { r, c }, drop: type, promotion: "none" });
      }
    }
  }
  return moves;
};

export const applyMove = (board: Board, hands: Hands, move: Move, owner: Owner) => {
  const nextBoard = cloneBoard(board);
  const nextHands = cloneHands(hands);
  if (move.drop) {
    nextHands[owner][move.drop] -= 1;
    nextBoard[move.to.r][move.to.c] = {
      type: move.drop,
      owner,
    };
    return { board: nextBoard, hands: nextHands };
  }
  if (!move.from) return { board: nextBoard, hands: nextHands };
  const piece = nextBoard[move.from.r][move.from.c];
  if (!piece) return { board: nextBoard, hands: nextHands };
  const target = nextBoard[move.to.r][move.to.c];
  if (target) {
    const capturedType = demote(target);
    if (capturedType !== "K") {
      nextHands[owner][capturedType] += 1;
    }
  }
  const promote = move.promotion === "must" || move.promotion === "optional";
  nextBoard[move.from.r][move.from.c] = null;
  nextBoard[move.to.r][move.to.c] = {
    ...piece,
    promoted: promote ? true : piece.promoted,
  };
  return { board: nextBoard, hands: nextHands };
};
