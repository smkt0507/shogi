"use client";

type Props = {
  aiDepth: number;
  aiTimeMs: number;
  aiThinking: boolean;
  onDepthChange: (value: number) => void;
  onTimeChange: (value: number) => void;
};

export default function AiSettingsPanel({
  aiDepth,
  aiTimeMs,
  aiThinking,
  onDepthChange,
  onTimeChange,
}: Props) {
  return (
    <div className="rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-200">
      <div className="mb-2 text-base font-semibold">AIの強さ</div>
      <select
        value={aiDepth}
        onChange={(event) => onDepthChange(Number(event.target.value))}
        className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
        disabled={aiThinking}
      >
        <option value={5}>Lv.1（深さ5）</option>
        <option value={6}>Lv.2（深さ6）</option>
        <option value={7}>Lv.3（深さ7）</option>
        <option value={8}>Lv.4（深さ8）</option>
      </select>
      <p className="mt-2 text-xs text-zinc-400">
        深さが上がるほど思考時間が長くなります。
      </p>
      <div className="mt-4">
        <div className="mb-2 text-base font-semibold">思考時間</div>
        <select
          value={aiTimeMs}
          onChange={(event) => onTimeChange(Number(event.target.value))}
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          disabled={aiThinking}
        >
          <option value={1000}>1.0秒</option>
          <option value={1500}>1.5秒</option>
          <option value={2500}>2.5秒</option>
          <option value={3500}>3.5秒</option>
        </select>
      </div>
    </div>
  );
}
