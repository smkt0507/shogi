"use client";

import { depthOptions, timeOptions } from "../lib/settings";

type Props = {
  playerOwner: "b" | "w";
  aiDepth: number;
  aiTimeMs: number;
  showHints: boolean;
  showEvaluationGraph: boolean;
  showFormationEffects: boolean;
  formationSound: boolean;
  onPlayerOwnerChange: (owner: "b" | "w") => void;
  onDepthChange: (value: number) => void;
  onTimeChange: (value: number) => void;
  onHintsChange: (enabled: boolean) => void;
  onEvaluationGraphChange: (enabled: boolean) => void;
  onFormationEffectsChange: (enabled: boolean) => void;
  onFormationSoundChange: (enabled: boolean) => void;
  onStart: () => void;
};

export default function SettingsPanel({
  playerOwner,
  aiDepth,
  aiTimeMs,
  showHints,
  showEvaluationGraph,
  showFormationEffects,
  formationSound,
  onPlayerOwnerChange,
  onDepthChange,
  onTimeChange,
  onHintsChange,
  onEvaluationGraphChange,
  onFormationEffectsChange,
  onFormationSoundChange,
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
            onChange={(event) =>
              onPlayerOwnerChange(event.target.value as "b" | "w")
            }
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
            {depthOptions.map((depth, index) => (
              <option key={depth} value={depth}>
                Lv.{index + 1}（深さ{depth}）
              </option>
            ))}
          </select>
        </div>
        <div>
          <div className="mb-2 text-sm font-semibold">思考時間</div>
          <select
            value={aiTimeMs}
            onChange={(event) => onTimeChange(Number(event.target.value))}
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100"
          >
            {timeOptions.map((time) => (
              <option key={time} value={time}>
                {(time / 1000).toFixed(1)}秒
              </option>
            ))}
          </select>
        </div>
        <fieldset className="space-y-3 border-t border-zinc-800 pt-4">
          <legend className="px-1 text-sm font-semibold">
            戦法・囲いの演出
          </legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-amber-300/20 bg-amber-950/10 p-3 hover:bg-amber-950/20">
            <input
              type="checkbox"
              checked={showFormationEffects}
              onChange={(event) =>
                onFormationEffectsChange(event.target.checked)
              }
              className="mt-1 h-4 w-4 accent-amber-300"
            />
            <span>
              <span className="block font-semibold text-amber-100">
                戦法エフェクト
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-zinc-400">
                囲いや戦法が成立した瞬間にカットイン。自分で使ったものは図鑑に残ります。
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-center gap-3 px-3 text-sm text-zinc-300">
            <input
              type="checkbox"
              checked={formationSound}
              disabled={!showFormationEffects}
              onChange={(event) => onFormationSoundChange(event.target.checked)}
              className="h-4 w-4 accent-amber-300 disabled:opacity-40"
            />
            効果音を鳴らす
          </label>
        </fieldset>
        <fieldset className="space-y-3 border-t border-zinc-800 pt-4">
          <legend className="px-1 text-sm font-semibold">学習モード</legend>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-700 p-3 hover:bg-zinc-800/60">
            <input
              type="checkbox"
              checked={showHints}
              onChange={(event) => onHintsChange(event.target.checked)}
              className="mt-1 h-4 w-4 accent-sky-400"
            />
            <span>
              <span className="block font-semibold">次の一手ヒント</span>
              <span className="mt-1 block text-xs leading-relaxed text-zinc-400">
                自分の手番にAIのおすすめを表示。動かす駒と移動先を盤上で確認できます。
              </span>
            </span>
          </label>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-zinc-700 p-3 hover:bg-zinc-800/60">
            <input
              type="checkbox"
              checked={showEvaluationGraph}
              onChange={(event) =>
                onEvaluationGraphChange(event.target.checked)
              }
              className="mt-1 h-4 w-4 accent-emerald-400"
            />
            <span>
              <span className="block font-semibold">評価値グラフ</span>
              <span className="mt-1 block text-xs leading-relaxed text-zinc-400">
                1手ごとの形勢を折れ線で表示。対局後も振り返れます。
              </span>
            </span>
          </label>
          <p className="text-xs text-zinc-500">両方同時に使えます。</p>
        </fieldset>
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
