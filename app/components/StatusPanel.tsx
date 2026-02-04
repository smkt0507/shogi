"use client";

import type { Owner } from "../lib/types";

type Props = {
  turn: Owner;
  winner: Owner | null;
  checkStatus: { b: boolean; w: boolean };
};

export default function StatusPanel({ turn, winner, checkStatus }: Props) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-200">
      <div className="mb-2 text-base font-semibold">ステータス</div>
      <ul className="space-y-2 text-zinc-300">
        <li>手番: {turn === "b" ? "あなた（先手）" : "AI（後手）"}</li>
        <li>
          勝敗: {winner ? (winner === "b" ? "あなたの勝ち" : "AIの勝ち") : "対局中"}
        </li>
        <li>王手: {checkStatus.b ? "あなたが王手" : checkStatus.w ? "AIが王手" : "なし"}</li>
      </ul>
    </div>
  );
}
