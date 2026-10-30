"use client";

import { useId, useState } from "react";
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
  const [active, setActive] = useState("game");
  const id = useId();
  const tabs = [
    { id: "game", label: "対局" },
    { id: "effects", label: "演出" },
    { id: "study", label: "学習" },
  ];
  return (
    <section className="settings-panel" aria-label="対局設定">
      <nav className="screen-tabs" role="tablist" aria-label="設定項目">
        {tabs.map((tab, index) => (
          <button
            key={tab.id}
            id={`${id}-${tab.id}-tab`}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            aria-controls={`${id}-${tab.id}-panel`}
            tabIndex={active === tab.id ? 0 : -1}
            onClick={() => setActive(tab.id)}
            onKeyDown={(event) => {
              const next = event.key === "ArrowRight" ? (index + 1) % tabs.length
                : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
                : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
              if (next === null) return;
              event.preventDefault();
              setActive(tabs[next].id);
              document.getElementById(`${id}-${tabs[next].id}-tab`)?.focus();
            }}
          >{tab.label}</button>
        ))}
      </nav>
      <div className="settings-content">
        <div id={`${id}-game-panel`} role="tabpanel" aria-labelledby={`${id}-game-tab`} hidden={active !== "game"} className="settings-game-fields">
          <label className="settings-field">
            <span>先手/後手</span>
            <select value={playerOwner} onChange={(event) => onPlayerOwnerChange(event.target.value as "b" | "w")}>
              <option value="b">先手（あなた）</option>
              <option value="w">後手（あなた）</option>
            </select>
          </label>
          <label className="settings-field">
            <span>AIの強さ</span>
            <select value={aiDepth} onChange={(event) => onDepthChange(Number(event.target.value))}>
              {depthOptions.map((depth, index) => <option key={depth} value={depth}>Lv.{index + 1}（深さ{depth}）</option>)}
            </select>
          </label>
          <label className="settings-field">
            <span>思考時間</span>
            <select value={aiTimeMs} onChange={(event) => onTimeChange(Number(event.target.value))}>
              {timeOptions.map((time) => <option key={time} value={time}>{(time / 1000).toFixed(1)}秒</option>)}
            </select>
          </label>
        </div>
        <div id={`${id}-effects-panel`} role="tabpanel" aria-labelledby={`${id}-effects-tab`} hidden={active !== "effects"} className="settings-options">
          <label className="settings-option is-gold">
            <input type="checkbox" checked={showFormationEffects} onChange={(event) => onFormationEffectsChange(event.target.checked)} />
            <span><strong>戦法エフェクト</strong><small>囲いや戦法が成立するとカットイン。使った形は図鑑に残ります。</small></span>
          </label>
          <label className="settings-option">
            <input type="checkbox" checked={formationSound} disabled={!showFormationEffects} onChange={(event) => onFormationSoundChange(event.target.checked)} />
            <span><strong>効果音を鳴らす</strong><small>演出に合わせて短い音を再生します。</small></span>
          </label>
        </div>
        <div id={`${id}-study-panel`} role="tabpanel" aria-labelledby={`${id}-study-tab`} hidden={active !== "study"} className="settings-options">
          <label className="settings-option">
            <input type="checkbox" checked={showHints} onChange={(event) => onHintsChange(event.target.checked)} />
            <span><strong>次の一手ヒント</strong><small>おすすめの駒と移動先を、盤上の青い印で確認できます。</small></span>
          </label>
          <label className="settings-option">
            <input type="checkbox" checked={showEvaluationGraph} onChange={(event) => onEvaluationGraphChange(event.target.checked)} />
            <span><strong>評価値グラフ</strong><small>1手ごとの形勢を記録。対局後にも振り返れます。</small></span>
          </label>
          <p className="settings-study-note">両方同時に使えます。</p>
        </div>
      </div>
      <footer className="settings-start">
        <button onClick={onStart} className="screen-primary-button">対局開始</button>
        <p>対局中は設定を変更できません。</p>
      </footer>
    </section>
  );
}
