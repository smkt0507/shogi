"use client";

import type { GameOutcome, Owner } from "../lib/types";

type Props = {
  turn: Owner;
  outcome: GameOutcome | null;
  checkStatus: { b: boolean; w: boolean };
  playerOwner: Owner;
};

export default function StatusPanel({
  turn,
  outcome,
  checkStatus,
  playerOwner,
}: Props) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-200">
      <div className="mb-2 text-base font-semibold">ステータス</div>
      <ul className="space-y-2 text-zinc-300">
        <li>
          手番: {turn === playerOwner ? "あなた" : "AI"}（
          {turn === "b" ? "先手" : "後手"}）
        </li>
        <li>
          勝敗:{" "}
          {outcome
            ? outcome.winner === null
              ? "千日手（引き分け）"
              : outcome.winner === playerOwner
                ? "あなたの勝ち"
                : "AIの勝ち"
            : "対局中"}
        </li>
        <li>
          王手:{" "}
          {checkStatus[playerOwner]
            ? "あなたの玉が王手されています"
            : checkStatus[playerOwner === "b" ? "w" : "b"]
              ? "AIの玉が王手されています"
              : "なし"}
        </li>
      </ul>
    </div>
  );
}
