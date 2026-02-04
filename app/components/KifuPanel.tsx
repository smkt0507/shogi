"use client";

import type { PieceType } from "../lib/types";
import { pieceLabel } from "../lib/constants";

type KifuEntry = {
  owner: "b" | "w";
  pieceType: PieceType;
  promoted: boolean;
  isDrop: boolean;
  to: { r: number; c: number };
  promotion: "none" | "optional" | "must";
  optionalPromotion: boolean;
  quality?: "good" | "bad" | "neutral";
};

type Props = {
  moves: KifuEntry[];
  heightClassName?: string;
};

const fileDigits = ["１", "２", "３", "４", "５", "６", "７", "８", "９"];
const rankKanji = ["一", "二", "三", "四", "五", "六", "七", "八", "九"];

const toSquareText = (r: number, c: number) => {
  const file = fileDigits[8 - c] ?? "?";
  const rank = rankKanji[r] ?? "?";
  return `${file}${rank}`;
};

const formatMove = (
  entry: KifuEntry,
  index: number,
  previousEntry?: KifuEntry,
) => {
  const prefix = entry.owner === "b" ? "▲" : "△";
  const label = entry.promoted
    ? pieceLabel[entry.pieceType].promoted
    : pieceLabel[entry.pieceType].base;
  const isSameSquare =
    previousEntry &&
    previousEntry.to.r === entry.to.r &&
    previousEntry.to.c === entry.to.c;
  const square = isSameSquare ? "同" : toSquareText(entry.to.r, entry.to.c);
  const suffix = entry.isDrop
    ? "打"
    : entry.promotion === "must"
      ? "成"
      : entry.optionalPromotion && entry.promotion === "none"
        ? "不成"
        : "";
  return `${index + 1}. ${prefix}${square}${label}${suffix}`;
};

export default function KifuPanel({ moves, heightClassName = "h-64" }: Props) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-200">
      <div className="mb-2 text-base font-semibold">棋譜</div>
      <div
        className={`${heightClassName} space-y-1 overflow-y-auto text-xs text-zinc-300`}
      >
        {moves.length === 0 ? (
          <div className="text-zinc-500">まだ指し手がありません。</div>
        ) : (
          moves.map((entry, index) => (
            <div
              key={`${index}-${entry.owner}`}
              className={
                entry.quality === "good"
                  ? "text-sky-400"
                  : entry.quality === "bad"
                    ? "text-rose-400"
                    : ""
              }
            >
              {formatMove(entry, index, moves[index - 1])}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
