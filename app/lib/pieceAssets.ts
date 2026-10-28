import type { Piece, PieceType } from "./types";

const baseImages: Record<PieceType, string> = {
  P: "/koma/fu.png",
  L: "/koma/kyou.png",
  N: "/koma/kei.png",
  S: "/koma/gin.png",
  G: "/koma/kin.png",
  B: "/koma/kaku.png",
  R: "/koma/hisha.png",
  K: "/koma/ou.png",
};
const promotedImages: Partial<Record<PieceType, string>> = {
  P: "/koma/fu-nari.png",
  L: "/koma/kyou-nari.png",
  N: "/koma/kei-nari.png",
  S: "/koma/gin-nari.png",
  B: "/koma/kaku-nari.png",
  R: "/koma/hisha-nari.png",
};
export const handPieceImage = (type: PieceType) => baseImages[type];
export const boardPieceImage = (piece: Piece) => {
  if (piece.type === "K")
    return piece.owner === "w" ? "/koma/gyoku.png" : "/koma/ou.png";
  return (
    (piece.promoted && promotedImages[piece.type]) || baseImages[piece.type]
  );
};
