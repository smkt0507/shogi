import type { Board, Hands, Owner } from "./types";
import { handOrder } from "./constants";

export const positionKey = (board: Board, hands: Hands, turn: Owner) => {
  const ranks = board.map((row) => {
    let empty = 0;
    let rank = "";
    for (const piece of row) {
      if (!piece) {
        empty += 1;
        continue;
      }
      if (empty) {
        rank += empty;
        empty = 0;
      }
      const label = piece.owner === "b" ? piece.type : piece.type.toLowerCase();
      rank += piece.promoted ? `+${label}` : label;
    }
    return rank + (empty || "");
  });
  let hand = "";
  for (const owner of ["b", "w"] as const) {
    for (const type of handOrder) {
      const count = hands[owner][type];
      if (count)
        hand += `${count > 1 ? count : ""}${owner === "b" ? type : type.toLowerCase()}`;
    }
  }
  return `${ranks.join("/")} ${turn} ${hand || "-"}`;
};
