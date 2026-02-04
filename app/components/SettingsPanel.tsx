"use client";

type Props = {
  playerOwner: "b" | "w";
  aiDepth: number;
  aiTimeMs: number;
  onPlayerOwnerChange: (owner: "b" | "w") => void;
  onDepthChange: (value: number) => void;
  onTimeChange: (value: number) => void;
  onStart: () => void;
};

export default function SettingsPanel({
  playerOwner,
  aiDepth,
  aiTimeMs,
  onPlayerOwnerChange,
  onDepthChange,
  onTimeChange,
  onStart,
}: Props) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-5 text-sm text-zinc-200">
      <div className="mb-4 text-base font-semibold">設定</div>
      <div className="space-y-4">
        <div>
          <div className="mb-2 text-sm font-semibold">先手/後手</div>
          <select
            value={playerOwner}
            onChange={(event) => onPlayerOwnerChange(event.target.value as "b" | "w")}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          >
            <option value="b">先手（あなた）</option>
            <option value="w">後手（あなた）</option>
          </select>
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold">AIの強さ</div>
          <select
            value={aiDepth}
            onChange={(event) => onDepthChange(Number(event.target.value))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          >
            <option value={5}>Lv.1（深さ5）</option>
            <option value={6}>Lv.2（深さ6）</option>
            <option value={7}>Lv.3（深さ7）</option>
            <option value={8}>Lv.4（深さ8）</option>
          </select>
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold">思考時間</div>
          <select
            value={aiTimeMs}
            onChange={(event) => onTimeChange(Number(event.target.value))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          >
            <option value={1000}>1.0秒</option>
            <option value={1500}>1.5秒</option>
            <option value={2500}>2.5秒</option>
            <option value={3500}>3.5秒</option>
          </select>
        </div>
      </div>
      <button
        onClick={onStart}
        className="mt-6 w-full rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-emerald-400"
      >
        対局開始
      </button>
      <p className="mt-3 text-xs text-zinc-400">
        対局中は設定を変更できません。
      </p>
    </div>
  );
}
