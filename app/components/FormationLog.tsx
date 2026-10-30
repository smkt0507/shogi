"use client";

import Link from "next/link";
import { useState } from "react";
import { usePanelPageSize } from "../lib/usePanelPageSize";
import { formationById } from "../lib/formations";
import type { FormationRecord, Owner } from "../lib/types";

export default function FormationLog({
  records,
  playerOwner,
}: {
  records: FormationRecord[];
  playerOwner: Owner;
}) {
  const { ref, pageSize } = usePanelPageSize(60, 12);
  const [requestedPage, setRequestedPage] = useState<number | null>(null);
  const pages = Math.max(1, Math.ceil(records.length / pageSize));
  const page = requestedPage === null ? pages - 1 : Math.min(requestedPage, pages - 1);
  const start = page * pageSize;
  return (
    <section
      className="viewport-list-panel formation-log-panel rounded-2xl border border-amber-300/15 bg-amber-950/10 text-sm"
      aria-label="この対局の戦法・囲い"
    >
      <div className="mb-2 flex shrink-0 items-center justify-between gap-2">
        <h2 className="font-semibold text-amber-200">戦法・囲い</h2>
        <Link
          href="/collection"
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-zinc-400 underline decoration-zinc-600 underline-offset-4 hover:text-amber-200"
          aria-label="図鑑を新しいタブで開く"
        >
          図鑑 ↗
        </Link>
      </div>
      <div ref={ref} className="viewport-list-space">
      {records.length ? (
        <ul>
          {records.slice(start, start + pageSize).map((record) => (
            <li
              key={`${record.owner}-${record.id}`}
              className="formation-log-row"
            >
              <span
                className={
                  record.owner === playerOwner
                    ? "text-amber-100"
                    : "text-sky-200"
                }
              >
                <span className="formation-log-owner">
                  {record.owner === playerOwner ? "自分" : "AI"}
                </span>
                {formationById(record.id).name}
              </span>
              <span className="shrink-0 text-xs text-zinc-500">
                {record.ply}手目
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs leading-relaxed text-zinc-400">
          囲いや戦法が成立すると、ここに記録されます。
        </p>
      )}
      </div>
      <nav className="list-pagination" aria-label="戦法・囲い履歴のページ">
        <button disabled={page === 0} onClick={() => setRequestedPage(page - 1)} aria-label="前の戦法・囲い">←</button>
        <span aria-live="polite">{records.length ? `${start + 1}〜${Math.min(start + pageSize, records.length)} / ${records.length}件` : "0件"}</span>
        <button disabled={page === pages - 1} onClick={() => setRequestedPage(page + 1 === pages - 1 ? null : page + 1)} aria-label="次の戦法・囲い">→</button>
        <button disabled={requestedPage === null || page === pages - 1} onClick={() => setRequestedPage(null)}>最新</button>
      </nav>
    </section>
  );
}
