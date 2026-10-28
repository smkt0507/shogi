"use client";

import { memo } from "react";
import Image from "next/image";
import type { Hands, Owner, PieceType } from "../lib/types";
import { handOrder, pieceLabel } from "../lib/constants";
import { handPieceImage } from "../lib/pieceAssets";

type Props = {
  title: string;
  hands: Hands;
  owner: Owner;
  selectable?: boolean;
  selectedDrop?: PieceType | null;
  onSelect?: (type: PieceType) => void;
  disabled?: boolean;
  compact?: boolean;
};

export default memo(function HandsPanel({
  title,
  hands,
  owner,
  selectable = false,
  selectedDrop = null,
  onSelect,
  disabled = false,
  compact = false,
}: Props) {
  return (
    <div
      className={
        compact
          ? "game-hands-panel rounded-xl bg-zinc-900 p-2"
          : "rounded-2xl bg-zinc-900 p-4"
      }
    >
      <div className={`${compact ? "mb-1" : "mb-2"} text-xs text-zinc-400`}>
        {title}
      </div>
      <div
        className={
          compact ? "grid min-h-8 grid-cols-7 gap-1" : "flex flex-wrap gap-2"
        }
      >
        {handOrder.map((type) => {
          const count = hands[owner][type];
          const isSelected = selectedDrop === type;
          if (count === 0) return null;
          const contents = (
            <>
              <Image
                src={handPieceImage(type)}
                alt={pieceLabel[type].base}
                width={32}
                height={32}
                sizes={compact ? "24px" : "32px"}
                className={`hand-piece-image ${compact ? "is-compact" : ""}`}
                draggable={false}
              />
              <span
                className={
                  compact
                    ? "absolute right-0 bottom-0 rounded bg-zinc-900/90 px-0.5 text-[10px] leading-3 text-zinc-300"
                    : "text-xs text-zinc-400"
                }
              >
                ×{count}
              </span>
            </>
          );
          if (!selectable)
            return (
              <div
                key={type}
                className={`flex items-center rounded-full bg-zinc-800 py-1 text-sm ${compact ? "relative min-w-0 justify-center" : "gap-2 px-3"}`}
              >
                {contents}
              </div>
            );
          return (
            <button
              key={`${owner}-${type}`}
              aria-label={`${pieceLabel[type].base}を打つ（持ち駒${count}枚）`}
              aria-pressed={isSelected}
              onClick={() => onSelect?.(type)}
              className={`flex items-center rounded-full py-1 text-sm transition ${compact ? "relative min-w-0 justify-center" : "gap-2 px-3"} ${
                count > 0 && !disabled
                  ? isSelected
                    ? "bg-emerald-400 text-zinc-900"
                    : "bg-zinc-800 hover:bg-zinc-700"
                  : "bg-zinc-800/40 text-zinc-500"
              }`}
              disabled={count <= 0 || disabled}
            >
              {contents}
            </button>
          );
        })}
      </div>
    </div>
  );
});
