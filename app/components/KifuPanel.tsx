"use client";

import { memo, useMemo } from "react";
import type { EvaluationEntry, KifuEntry, MoveQuality } from "../lib/types";
import { formatKifuEntry } from "../lib/notation";
import { moveQuality } from "../lib/analysis";

type Props = {
  moves: KifuEntry[];
  evaluations: EvaluationEntry[];
  heightClassName?: string;
  className?: string;
};

const KifuRow = memo(function KifuRow({
  label,
  quality,
}: {
  label: string;
  quality: MoveQuality;
}) {
  return (
    <div
      className={
        quality === "good"
          ? "text-sky-400"
          : quality === "bad"
            ? "text-rose-400"
            : ""
      }
    >
      {label}
    </div>
  );
});

export default memo(function KifuPanel({
  moves,
  evaluations,
  heightClassName = "h-64",
  className = "",
}: Props) {
  const labels = useMemo(
    () =>
      moves.map((entry, index) =>
        formatKifuEntry(entry, index, moves[index - 1]),
      ),
    [moves],
  );
  return (
    <section
      className={`flex min-h-0 flex-col rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-200 ${className}`}
      aria-label="棋譜"
    >
      <h2 className="mb-2 shrink-0 text-base font-semibold">棋譜</h2>
      <div
        className={`${heightClassName} space-y-1 overflow-y-auto text-xs text-zinc-300`}
      >
        {moves.length === 0 ? (
          <div className="text-zinc-500">まだ指し手がありません。</div>
        ) : (
          moves.map((entry, index) => (
            <KifuRow
              key={index}
              label={labels[index]}
              quality={moveQuality(
                evaluations[index],
                evaluations[index + 1],
                entry.owner,
              )}
            />
          ))
        )}
      </div>
    </section>
  );
});
