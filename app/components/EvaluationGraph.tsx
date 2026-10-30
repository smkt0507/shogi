"use client";

import { memo, useId, useMemo, useState } from "react";
import type { EvaluationEntry } from "../lib/types";
import { formatEvaluation } from "../lib/notation";

export default memo(function EvaluationGraph({
  entries,
  compact = false,
}: {
  entries: EvaluationEntry[];
  compact?: boolean;
}) {
  const id = useId();
  const [selectedPly, setSelectedPly] = useState<number | null>(null);
  const last = entries.at(-1);
  const selected = entries[selectedPly ?? entries.length - 1] ?? last;
  const { limit, x, y, points, markers } = useMemo(() => {
    const maxScore = entries.reduce(
      (maximum, entry) => Math.max(maximum, Math.abs(entry.score)),
      0,
    );
    const limit = Math.min(
      3000,
      Math.max(500, Math.ceil(maxScore / 500) * 500),
    );
    const x = (ply: number) =>
      62 + (ply / Math.max(entries.at(-1)?.ply ?? 0, 1)) * 506;
    const y = (score: number) =>
      110 - (Math.max(-limit, Math.min(limit, score)) / limit) * 78;
    return {
      limit,
      x,
      y,
      points: entries
        .map((entry) => `${x(entry.ply)},${y(entry.score)}`)
        .join(" "),
      markers: entries.map((entry) => (
        <circle
          key={entry.ply}
          cx={x(entry.ply)}
          cy={y(entry.score)}
          r="5"
          fill="#34d399"
          onMouseEnter={() => setSelectedPly(entry.ply)}
          onClick={() => setSelectedPly(entry.ply)}
        >
          <title>
            {entry.ply}手目: {formatEvaluation(entry.score)}
          </title>
        </circle>
      )),
    };
  }, [entries]);

  return (
    <section
      className={`evaluation-panel w-full rounded-2xl bg-zinc-900 text-sm text-zinc-200 ${compact ? "p-3" : "p-4"}`}
      aria-label="評価値グラフ"
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-base font-semibold">評価値グラフ</h2>
        <span className="text-xs text-zinc-400">
          {compact ? "＋先手 / −後手" : "先手基準"}
        </span>
      </div>
      {!compact && (
        <p className="mt-2 text-xs text-zinc-400">＋は先手有利、−は後手有利</p>
      )}
      <svg
        viewBox="0 0 600 226"
        className="evaluation-plot"
        role="img"
        aria-labelledby={`${id}-title ${id}-description`}
      >
        <title id={`${id}-title`}>1手ごとの評価値の推移</title>
        <desc id={`${id}-description`}>
          横軸は手数、縦軸は先手基準の評価値です。大きな評価値はグラフの上下端に表示します。下のスライダーで各手の実際の数値を確認できます。
        </desc>
        <rect
          x="62"
          y="32"
          width="506"
          height="78"
          fill="rgb(16 185 129 / 0.07)"
        />
        <rect
          x="62"
          y="110"
          width="506"
          height="78"
          fill="rgb(244 63 94 / 0.06)"
        />
        {[limit, 0, -limit].map((value) => (
          <g key={value}>
            <line
              x1="62"
              x2="568"
              y1={y(value)}
              y2={y(value)}
              stroke={value === 0 ? "#71717a" : "#3f3f46"}
              strokeDasharray={value === 0 ? undefined : "4 5"}
            />
            <text
              x="52"
              y={y(value) + 5}
              textAnchor="end"
              fill="#a1a1aa"
              fontSize="18"
            >
              {value > 0 ? "+" : ""}
              {value}
            </text>
          </g>
        ))}
        <text x="62" y="217" fill="#a1a1aa" fontSize="18">
          0手
        </text>
        <text x="568" y="217" textAnchor="end" fill="#a1a1aa" fontSize="18">
          {last?.ply ?? 0}手
        </text>
        <polyline
          points={points}
          fill="none"
          stroke="#34d399"
          strokeWidth="3"
          strokeLinejoin="round"
        />
        {markers}
        {selected && (
          <circle
            cx={x(selected.ply)}
            cy={y(selected.score)}
            r="8"
            fill="#09090b"
            stroke="#7dd3fc"
            strokeWidth="3"
            pointerEvents="none"
          />
        )}
      </svg>
      {selected ? (
        <>
          <label
            htmlFor={`${id}-ply`}
            className={compact ? "sr-only" : "text-xs text-zinc-400"}
          >
            手数を選んで評価値を確認
          </label>
          <input
            id={`${id}-ply`}
            type="range"
            min="0"
            max={last?.ply ?? 0}
            value={selected.ply}
            onChange={(event) => setSelectedPly(Number(event.target.value))}
            className="mt-2 w-full accent-emerald-400"
            disabled={!last?.ply}
          />
          <div
            className="mt-2 flex items-center justify-between gap-2"
            aria-live="polite"
          >
            <span className="text-xs text-zinc-400">
              {selected.ply === 0 ? "開始局面" : `${selected.ply}手目の局面`}
            </span>
            <span className="font-mono text-lg font-semibold text-emerald-300">
              {formatEvaluation(selected.score)}
            </span>
          </div>
          <p
            className="mt-2 text-xs text-zinc-500"
            title={
              selected.source === "local"
                ? "駒の価値・配置などから算出"
                : undefined
            }
          >
            {selected.source === "engine"
              ? "やねうら王の評価値"
              : compact
                ? "簡易評価"
                : "簡易評価（駒の価値・配置などから算出）"}
          </p>
        </>
      ) : (
        <p className="text-xs text-zinc-500">評価値を取得しています…</p>
      )}
      {!compact && (
        <p className="mt-2 text-xs leading-relaxed text-zinc-500">
          大きな評価値はグラフの上下端に表示します。数値は実際の評価値です。
        </p>
      )}
    </section>
  );
});
