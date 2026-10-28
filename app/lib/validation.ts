import type { Board, Hands, Move, Owner, PieceType } from "./types";

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

export const isOwner = (value: unknown): value is Owner =>
  value === "b" || value === "w";
export const pieceTypes: PieceType[] = ["P", "L", "N", "S", "G", "B", "R", "K"];
const maxPieces: Record<PieceType, number> = {
  P: 18,
  L: 4,
  N: 4,
  S: 4,
  G: 4,
  B: 2,
  R: 2,
  K: 2,
};
const isPieceType = (value: unknown): value is PieceType =>
  typeof value === "string" && pieceTypes.includes(value as PieceType);

const isSquare = (value: unknown): value is Move["to"] =>
  isRecord(value) &&
  Number.isInteger(value.r) &&
  Number.isInteger(value.c) &&
  (value.r as number) >= 0 &&
  (value.r as number) < 9 &&
  (value.c as number) >= 0 &&
  (value.c as number) < 9;

export const isMove = (value: unknown): value is Move => {
  if (!isRecord(value) || !isSquare(value.to)) return false;
  if (!["none", "optional", "must"].includes(value.promotion as string))
    return false;
  if (value.drop !== undefined) {
    return (
      isPieceType(value.drop) &&
      value.drop !== "K" &&
      value.from === undefined &&
      value.promotion === "none"
    );
  }
  return isSquare(value.from);
};

export type AiRequest = {
  board: Board;
  hands: Hands;
  turn: Owner;
  depth: number;
  timeMs: number;
  mode: "bestmove" | "evaluate";
};

export const parseAiRequest = (value: unknown): AiRequest | null => {
  if (!isRecord(value) || !isOwner(value.turn)) return null;
  if (
    !Array.isArray(value.board) ||
    value.board.length !== 9 ||
    !isRecord(value.hands)
  )
    return null;
  const counts = Object.fromEntries(
    pieceTypes.map((type) => [type, 0]),
  ) as Record<PieceType, number>;
  const kings = { b: 0, w: 0 };
  for (const row of value.board) {
    if (!Array.isArray(row) || row.length !== 9) return null;
    for (const piece of row) {
      if (piece === null) continue;
      if (!isRecord(piece) || !isPieceType(piece.type) || !isOwner(piece.owner))
        return null;
      if (piece.promoted !== undefined && typeof piece.promoted !== "boolean")
        return null;
      if (piece.promoted && (piece.type === "K" || piece.type === "G"))
        return null;
      counts[piece.type] += 1;
      if (piece.type === "K") kings[piece.owner] += 1;
    }
  }
  for (const owner of ["b", "w"] as const) {
    const hand = value.hands[owner];
    if (!isRecord(hand)) return null;
    for (const type of pieceTypes) {
      const count = hand[type];
      if (
        !Number.isInteger(count) ||
        (count as number) < 0 ||
        (count as number) > maxPieces[type]
      )
        return null;
      if (type === "K" && count !== 0) return null;
      counts[type] += count as number;
    }
  }
  if (
    kings.b !== 1 ||
    kings.w !== 1 ||
    pieceTypes.some((type) => counts[type] > maxPieces[type])
  )
    return null;
  if (
    value.mode !== undefined &&
    value.mode !== "bestmove" &&
    value.mode !== "evaluate"
  )
    return null;
  if (
    value.depth !== undefined &&
    (!Number.isInteger(value.depth) ||
      (value.depth as number) < 1 ||
      (value.depth as number) > 12)
  )
    return null;
  if (
    value.timeMs !== undefined &&
    (typeof value.timeMs !== "number" ||
      !Number.isFinite(value.timeMs) ||
      value.timeMs < 50 ||
      value.timeMs > 5000)
  )
    return null;
  return {
    board: value.board as Board,
    hands: value.hands as Hands,
    turn: value.turn,
    depth: (value.depth as number) ?? 5,
    timeMs: (value.timeMs as number) ?? 1000,
    mode: value.mode ?? "bestmove",
  };
};
