"use client";

import Image from "next/image";
import type { Hands, Owner, PieceType } from "../lib/types";
import { handOrder, pieceLabel } from "../lib/constants";

type Props = {
  title: string;
  hands: Hands;
  owner: Owner;
  selectable?: boolean;
  selectedDrop?: PieceType | null;
  onSelect?: (type: PieceType) => void;
  disabled?: boolean;
};

export default function HandsPanel({
  title,
  hands,
  owner,
  selectable = false,
  selectedDrop = null,
  onSelect,
  disabled = false,
}: Props) {
  const getHandPieceImage = (type: PieceType) => {
    const baseMap: Record<PieceType, string> = {
      P: "/koma/fu.png",
      L: "/koma/kyou.png",
      N: "/koma/kei.png",
      S: "/koma/gin.png",
      G: "/koma/kin.png",
      B: "/koma/kaku.png",
      R: "/koma/hisha.png",
      K: "/koma/ou.png",
    };
    return baseMap[type];
  };

  return (
    <div className="rounded-2xl bg-zinc-900 p-4">
      <div className="mb-2 text-xs text-zinc-400">{title}</div>
      <div className="flex flex-wrap gap-2">
        {handOrder.map((type) => {
          const count = hands[owner][type];
          const isSelected = selectedDrop === type;
          if (count === 0) return null;
          if (!selectable) {
            return (
              <div
                key={`${owner}-${type}`}
                className="flex items-center gap-2 rounded-full bg-zinc-800 px-3 py-1 text-sm"
              >
                <Image
                  src={getHandPieceImage(type)}
                  alt={pieceLabel[type].base}
                  width={32}
                  height={32}
                  sizes="32px"
                  className="hand-piece-image"
                  draggable={false}
                />
                <span className="text-xs text-zinc-400">×{count}</span>
              </div>
            );
          }
          return (
            <button
              key={`${owner}-${type}`}
              onClick={() => onSelect?.(type)}
              className={`flex items-center gap-2 rounded-full px-3 py-1 text-sm transition ${
                count > 0 && !disabled
                  ? isSelected
                    ? "bg-emerald-400 text-zinc-900"
                    : "bg-zinc-800 hover:bg-zinc-700"
                  : "bg-zinc-800/40 text-zinc-500"
              }`}
              disabled={count <= 0 || disabled}
            >
              <Image
                src={getHandPieceImage(type)}
                alt={pieceLabel[type].base}
                width={32}
                height={32}
                sizes="32px"
                className="hand-piece-image"
                draggable={false}
              />
              <span className="text-xs text-zinc-400">×{count}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
