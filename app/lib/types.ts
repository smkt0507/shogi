export type Owner = "b" | "w";
export type PieceType = "P" | "L" | "N" | "S" | "G" | "B" | "R" | "K";
export type Piece = {
  type: PieceType;
  owner: Owner;
  promoted?: boolean;
};
export type Board = (Piece | null)[][];
export type Hands = Record<Owner, Record<PieceType, number>>;
export type Move = {
  from?: { r: number; c: number };
  to: { r: number; c: number };
  drop?: PieceType;
  promotion: "none" | "optional" | "must";
};
