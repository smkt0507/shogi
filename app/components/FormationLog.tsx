import Link from "next/link";
import { formationById } from "../lib/formations";
import type { FormationRecord, Owner } from "../lib/types";

export default function FormationLog({
  records,
  playerOwner,
}: {
  records: FormationRecord[];
  playerOwner: Owner;
}) {
  return (
    <section
      className="rounded-2xl border border-amber-300/15 bg-amber-950/10 p-4 text-sm"
      aria-label="この対局の戦法・囲い"
    >
      <div className="mb-3 flex items-center justify-between gap-2">
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
      {records.length ? (
        <ul className="max-h-36 space-y-2 overflow-y-auto">
          {records.map((record) => (
            <li
              key={`${record.owner}-${record.id}`}
              className="flex items-center justify-between gap-2"
            >
              <span
                className={
                  record.owner === playerOwner
                    ? "text-amber-100"
                    : "text-sky-200"
                }
              >
                <span className="mr-2 text-xs opacity-65">
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
    </section>
  );
}
