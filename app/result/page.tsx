"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Owner } from "../lib/types";

const SETTINGS_KEY = "shogi-settings";
const RESULT_KEY = "shogi-result";

type ResultState = {
  winner: Owner;
  playerOwner: Owner;
};

export default function ResultPage() {
  const router = useRouter();
  const [result] = useState<ResultState | null>(() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(RESULT_KEY);
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved) as ResultState;
      if (
        (parsed.winner === "b" || parsed.winner === "w") &&
        (parsed.playerOwner === "b" || parsed.playerOwner === "w")
      ) {
        return parsed;
      }
    } catch {
      return null;
    }
    return null;
  });

  const handleRematch = () => {
    const savedSettings = localStorage.getItem(SETTINGS_KEY);
    if (!savedSettings) {
      router.push("/settings");
      return;
    }
    router.push("/game");
  };

  const handleBackToSettings = () => {
    router.push("/settings");
  };

  const resultText = result
    ? result.winner === result.playerOwner
      ? "あなたの勝ち"
      : "あなたの負け"
    : "結果未確定";

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-6">
        <h1 className="text-3xl font-semibold tracking-tight">対局結果</h1>
        <div className="rounded-2xl bg-zinc-900 px-8 py-10 text-center">
          <div className="text-sm text-zinc-400">勝敗</div>
          <div className="mt-3 text-3xl font-semibold">{resultText}</div>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            onClick={handleRematch}
            className="rounded-full bg-emerald-400 px-6 py-2 text-sm font-semibold text-zinc-900 transition hover:bg-emerald-300"
          >
            もう一度対局する
          </button>
          <button
            onClick={handleBackToSettings}
            className="rounded-full border border-zinc-700 px-6 py-2 text-sm text-zinc-200 transition hover:bg-zinc-900"
          >
            設定に戻る
          </button>
        </div>
      </div>
    </div>
  );
}
