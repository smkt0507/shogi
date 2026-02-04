"use client";

import Image from "next/image";
import type { Board, Move, Owner } from "../lib/types";
import { pieceLabel } from "../lib/constants";

type Props = {
  board: Board;
  selected: { r: number; c: number } | null;
  legalTargets: Map<string, Move>;
  turn: Owner;
  lastMove: Move | null;
  playerOwner: Owner;
  onSquareClick: (r: number, c: number) => void;
};

export default function ShogiBoard({
  board,
  selected,
  legalTargets,
  turn,
  lastMove,
  playerOwner,
  onSquareClick,
}: Props) {
  const getPieceImage = (cell: NonNullable<(typeof board)[number][number]>) => {
    if (cell.type === "K") {
      return cell.owner === "w" ? "/koma/gyoku.png" : "/koma/ou.png";
    }

    const baseMap: Record<Exclude<typeof cell.type, "K">, string> = {
      P: "/koma/fu.png",
      L: "/koma/kyou.png",
      N: "/koma/kei.png",
      S: "/koma/gin.png",
      G: "/koma/kin.png",
      B: "/koma/kaku.png",
      R: "/koma/hisha.png",
    };

    const promotedMap: Partial<Record<typeof cell.type, string>> = {
      P: "/koma/fu-nari.png",
      L: "/koma/kyou-nari.png",
      N: "/koma/kei-nari.png",
      S: "/koma/gin-nari.png",
      B: "/koma/kaku-nari.png",
      R: "/koma/hisha-nari.png",
    };

    if (cell.promoted && promotedMap[cell.type]) {
      return promotedMap[cell.type]!;
    }

    return baseMap[cell.type];
  };

  return (
    <div className="shogi-board rounded-2xl p-4 text-zinc-900">
      <div className="shogi-grid">
        {board.map((row, r) =>
          row.map((cell, c) => {
            const isSelected = selected?.r === r && selected?.c === c;
            const isTarget = legalTargets.has(`${r}-${c}`);
            const isCapture = isTarget && !!board[r][c] && board[r][c]?.owner !== turn;
            const isLastMove = lastMove?.to.r === r && lastMove?.to.c === c;
            return (
              <button
                key={`${r}-${c}`}
                onClick={() => onSquareClick(r, c)}
                className={`shogi-cell flex items-center justify-center rounded-md text-lg font-semibold ${
                  isSelected ? "is-selected" : ""
                } ${isCapture ? "is-capture" : ""} ${
                  !isCapture && isTarget ? "is-target" : ""
                } ${isLastMove ? "is-last-move" : ""}`}
              >
                {cell ? (
                  <Image
                    src={getPieceImage(cell)}
                    alt={
                      cell.promoted
                        ? pieceLabel[cell.type].promoted
                        : pieceLabel[cell.type].base
                    }
                    className={`shogi-piece ${cell.owner !== playerOwner ? "is-opponent" : ""}`}
                    width={128}
                    height={128}
                    sizes="(max-width: 768px) 12vw, 64px"
                    draggable={false}
                  />
                ) : null}
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
