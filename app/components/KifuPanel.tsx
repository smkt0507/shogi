"use client";

import { memo, useMemo, useState } from "react";
import type { EvaluationEntry, KifuEntry, MoveQuality } from "../lib/types";
import { formatKifuEntry } from "../lib/notation";
import { moveQuality } from "../lib/analysis";
import { usePanelPageSize } from "../lib/usePanelPageSize";

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
  className = "",
}: Props) {
  const labels = useMemo(
    () =>
      moves.map((entry, index) =>
        formatKifuEntry(entry, index, moves[index - 1]),
      ),
    [moves],
  );
  const { ref, pageSize } = usePanelPageSize(24);
  const [requestedPage, setRequestedPage] = useState<number | null>(null);
  const pages = Math.max(1, Math.ceil(moves.length / pageSize));
  const page = requestedPage === null ? pages - 1 : Math.min(requestedPage, pages - 1);
  const start = page * pageSize;
  return (
    <section
      className={`viewport-list-panel kifu-panel rounded-2xl bg-zinc-900 text-sm text-zinc-200 ${className}`}
      aria-label="棋譜"
    >
      <h2 className="mb-2 shrink-0 text-sm font-semibold">棋譜</h2>
      <div
        ref={ref}
        className="viewport-list-space text-xs text-zinc-300"
      >
        {moves.length === 0 ? (
          <div className="text-zinc-500">まだ指し手がありません。</div>
        ) : (
          moves.slice(start, start + pageSize).map((entry, offset) => {
            const index = start + offset;
            return (
              <KifuRow
                key={index}
                label={labels[index]}
                quality={moveQuality(
                  evaluations[index],
                  evaluations[index + 1],
                  entry.owner,
                )}
              />
            );
          })
        )}
      </div>
      <nav className="list-pagination" aria-label="棋譜のページ">
        <button disabled={page === 0} onClick={() => setRequestedPage(page - 1)} aria-label="前の棋譜">←</button>
        <span aria-live="polite">{moves.length ? `${start + 1}〜${Math.min(start + pageSize, moves.length)} / ${moves.length}手` : "0手"}</span>
        <button disabled={page === pages - 1} onClick={() => setRequestedPage(page + 1 === pages - 1 ? null : page + 1)} aria-label="次の棋譜">→</button>
        <button disabled={requestedPage === null || page === pages - 1} onClick={() => setRequestedPage(null)}>最新</button>
      </nav>
    </section>
  );
});
