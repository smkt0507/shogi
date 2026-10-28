"use client";

import type { Board, Move, Owner } from "../lib/types";
import { describeMove, squareText } from "../lib/notation";

type Props = {
  board: Board;
  move: Move | null;
  playerOwner: Owner;
  isPlayerTurn: boolean;
  loading: boolean;
  onRetry: () => void;
};

export default function HintPanel({
  board,
  move,
  playerOwner,
  isPlayerTurn,
  loading,
  onRetry,
}: Props) {
  return (
    <section
      className="rounded-2xl border border-sky-400/25 bg-sky-950/30 p-4 text-sm text-zinc-200"
      aria-label="次の一手ヒント"
    >
      <h2 className="mb-3 font-semibold text-sky-300">次の一手ヒント</h2>
      <div aria-live="polite" aria-busy={loading}>
        {!isPlayerTurn ? (
          <p className="text-xs text-zinc-400">
            あなたの手番になると、おすすめの一手を表示します。
          </p>
        ) : loading ? (
          <p className="text-sm text-sky-200">おすすめの一手を考えています…</p>
        ) : move ? (
          <>
            <p className="text-xl font-semibold tracking-wide">
              {describeMove(board, move, playerOwner)}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300">
              {move.from
                ? `${squareText(move.from)}の駒を${squareText(move.to)}へ${move.promotion === "must" ? "動かして成ります。" : "動かします。"}`
                : `持ち駒を${squareText(move.to)}に打ちます。`}
            </p>
            <p className="mt-2 text-xs text-sky-300/80">
              {move.drop
                ? "盤上の青い丸が、持ち駒を打つ場所です。"
                : "盤上の青い枠が移動元、青い丸が移動先です。"}
            </p>
          </>
        ) : (
          <div className="text-xs text-zinc-400">
            <p>おすすめの一手を取得できませんでした。</p>
            <button
              onClick={onRetry}
              className="mt-2 rounded-lg border border-sky-700 px-3 py-1 text-sky-300"
            >
              再試行
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
