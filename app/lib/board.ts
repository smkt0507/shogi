import type { Board, Hands, Piece, PieceType } from "./types";

export const emptyHands = (): Hands => ({
  b: { P: 0, L: 0, N: 0, S: 0, G: 0, B: 0, R: 0, K: 0 },
  w: { P: 0, L: 0, N: 0, S: 0, G: 0, B: 0, R: 0, K: 0 },
});

export const initialBoard = (): Board => {
  const emptyRow = () => Array.from({ length: 9 }, () => null as Piece | null);
  const board = Array.from({ length: 9 }, emptyRow);
  const backRank: PieceType[] = ["L", "N", "S", "G", "K", "G", "S", "N", "L"];

  for (let c = 0; c < 9; c += 1) {
    board[0][c] = { type: backRank[c], owner: "w" };
    board[2][c] = { type: "P", owner: "w" };
    board[6][c] = { type: "P", owner: "b" };
    board[8][c] = { type: backRank[c], owner: "b" };
  }
  board[1][1] = { type: "R", owner: "w" };
  board[1][7] = { type: "B", owner: "w" };
  board[7][1] = { type: "B", owner: "b" };
  board[7][7] = { type: "R", owner: "b" };

  return board;
};

export const cloneBoard = (board: Board): Board =>
  board.map((row) => row.map((cell) => (cell ? { ...cell } : null)));

export const cloneHands = (hands: Hands): Hands => ({
  b: { ...hands.b },
  w: { ...hands.w },
});
