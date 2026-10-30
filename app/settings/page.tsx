"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import SettingsPanel from "../components/SettingsPanel";
import type { GameSettings } from "../lib/types";
import { defaultSettings, parseSettings, SETTINGS_KEY } from "../lib/settings";
import { useLocalStorageValue } from "../lib/useLocalStorageValue";
import { writeStoredValue } from "../lib/storage";
import { prepareFormationSound } from "../lib/formation-sound";

function SettingsForm({ initialSettings }: { initialSettings: GameSettings }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);

  const handleStartGame = () => {
    if (settings.formationSound && settings.showFormationEffects)
      prepareFormationSound();
    writeStoredValue(SETTINGS_KEY, JSON.stringify(settings));
    router.push("/game");
  };

  return (
    <SettingsPanel
      {...settings}
      onPlayerOwnerChange={(playerOwner) =>
        setSettings((prev) => ({ ...prev, playerOwner }))
      }
      onDepthChange={(aiDepth) => setSettings((prev) => ({ ...prev, aiDepth }))}
      onTimeChange={(aiTimeMs) =>
        setSettings((prev) => ({ ...prev, aiTimeMs }))
      }
      onHintsChange={(showHints) =>
        setSettings((prev) => ({ ...prev, showHints }))
      }
      onEvaluationGraphChange={(showEvaluationGraph) =>
        setSettings((prev) => ({ ...prev, showEvaluationGraph }))
      }
      onFormationEffectsChange={(showFormationEffects) =>
        setSettings((prev) => ({ ...prev, showFormationEffects }))
      }
      onFormationSoundChange={(formationSound) =>
        setSettings((prev) => ({ ...prev, formationSound }))
      }
      onStart={handleStartGame}
    />
  );
}

export default function SettingsPage() {
  const saved = useLocalStorageValue(SETTINGS_KEY);

  return (
    <div className="viewport-screen settings-screen bg-zinc-950 text-zinc-100">
      <div className="settings-shell">
        <header className="settings-page-header">
          <h1 className="text-2xl font-semibold tracking-tight">将棋AI対戦</h1>
          <p className="text-xs text-zinc-400">
            対局設定を行ってから「対局開始」を押してください。
          </p>
        </header>
        {saved !== undefined && (
          <SettingsForm
            initialSettings={parseSettings(saved) ?? defaultSettings}
          />
        )}
        <Link href="/collection" className="collection-entry settings-collection-link">
          <span className="collection-entry-seal" aria-hidden="true">
            録
          </span>
          <span className="flex-1">
            <span className="block font-semibold text-amber-100">
              戦法・囲い図鑑
            </span>
            <span className="mt-1 block text-xs text-zinc-400">
              新しい指し方を見つけて、自分の一手に。
            </span>
          </span>
          <span className="text-amber-200" aria-hidden="true">
            →
          </span>
        </Link>
      </div>
    </div>
  );
}
