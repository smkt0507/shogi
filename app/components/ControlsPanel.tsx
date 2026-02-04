"use client";

type Props = {
  onReset: () => void;
};

export default function ControlsPanel({ onReset }: Props) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-200">
      <div className="mb-2 text-base font-semibold">操作</div>
      <ul className="list-disc space-y-1 pl-4 text-zinc-300">
        <li>自分の駒をクリックして移動先を選択。</li>
        <li>持ち駒をクリックして盤に打つ。</li>
        <li>成れるときは「成る/成らない」を選択。</li>
      </ul>
      <button
        onClick={onReset}
        className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-emerald-400"
      >
        対局をリセット
      </button>
    </div>
  );
}
