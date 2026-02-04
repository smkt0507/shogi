"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import SettingsPanel from "../components/SettingsPanel";
import type { Owner } from "../lib/types";

const SETTINGS_KEY = "shogi-settings";

const readStoredSettings = () => {
  if (typeof window === "undefined") return null;
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved) as {
      playerOwner?: Owner;
      aiDepth?: number;
      aiTimeMs?: number;
    };
    return {
      playerOwner:
        parsed.playerOwner === "b" || parsed.playerOwner === "w"
          ? parsed.playerOwner
          : undefined,
      aiDepth: typeof parsed.aiDepth === "number" ? parsed.aiDepth : undefined,
      aiTimeMs:
        typeof parsed.aiTimeMs === "number" ? parsed.aiTimeMs : undefined,
    };
  } catch {
    return null;
  }
};

export default function SettingsPage() {
  const router = useRouter();
  const initialSettings = readStoredSettings();
  const [playerOwner, setPlayerOwner] = useState<Owner>(
    initialSettings?.playerOwner ?? "b",
  );
  const [aiDepth, setAiDepth] = useState(initialSettings?.aiDepth ?? 5);
  const [aiTimeMs, setAiTimeMs] = useState(initialSettings?.aiTimeMs ?? 1000);

  const handleStartGame = () => {
    localStorage.setItem(
      SETTINGS_KEY,
      JSON.stringify({ playerOwner, aiDepth, aiTimeMs }),
    );
    router.push("/game");
  };

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">将棋AI対戦</h1>
          <p className="text-sm text-zinc-300">
            対局設定を行ってから「対局開始」を押してください。
          </p>
        </header>
        <SettingsPanel
          playerOwner={playerOwner}
          aiDepth={aiDepth}
          aiTimeMs={aiTimeMs}
          onPlayerOwnerChange={setPlayerOwner}
          onDepthChange={setAiDepth}
          onTimeChange={setAiTimeMs}
          onStart={handleStartGame}
        />
      </div>
    </div>
  );
}
