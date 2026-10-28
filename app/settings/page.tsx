"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SettingsPanel from "../components/SettingsPanel";
import type { GameSettings } from "../lib/types";
import { defaultSettings, parseSettings, SETTINGS_KEY } from "../lib/settings";
import { useLocalStorageValue } from "../lib/useLocalStorageValue";
import { writeStoredValue } from "../lib/storage";

function SettingsForm({ initialSettings }: { initialSettings: GameSettings }) {
  const router = useRouter();
  const [settings, setSettings] = useState(initialSettings);

  const handleStartGame = () => {
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
      onStart={handleStartGame}
    />
  );
}

export default function SettingsPage() {
  const saved = useLocalStorageValue(SETTINGS_KEY);

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">将棋AI対戦</h1>
          <p className="text-sm text-zinc-300">
            対局設定を行ってから「対局開始」を押してください。
          </p>
        </header>
        {saved !== undefined && (
          <SettingsForm
            initialSettings={parseSettings(saved) ?? defaultSettings}
          />
        )}
      </div>
    </div>
  );
}
