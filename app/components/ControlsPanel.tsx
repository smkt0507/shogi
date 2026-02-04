"use client";

type Props = {
  onReset: () => void;
  onBackToSettings: () => void;
};

export default function ControlsPanel({ onReset, onBackToSettings }: Props) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-200">
      <button
        onClick={onReset}
        className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-emerald-400"
      >
        対局をリセット
      </button>
      <button
        onClick={onBackToSettings}
        className="mt-2 w-full rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:bg-zinc-800"
      >
        設定へ戻る
      </button>
    </div>
  );
}
