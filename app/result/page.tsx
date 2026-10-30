"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import Link from "next/link";
import FormationLog from "../components/FormationLog";
import EvaluationGraph from "../components/EvaluationGraph";
import {
  parseResult,
  parseSettings,
  SETTINGS_KEY,
  RESULT_KEY,
} from "../lib/settings";
import { useLocalStorageValue } from "../lib/useLocalStorageValue";
import { readStoredValue } from "../lib/storage";

export default function ResultPage() {
  const router = useRouter();
  const saved = useLocalStorageValue(RESULT_KEY);
  const result = useMemo(() => parseResult(saved ?? null), [saved]);
  const [activeDetail, setActiveDetail] = useState("evaluation");

  const handleRematch = () => {
    if (!parseSettings(readStoredValue(SETTINGS_KEY))) {
      router.push("/settings");
      return;
    }
    router.push("/game");
  };

  const handleBackToSettings = () => {
    router.push("/settings");
  };

  const resultText = result
    ? result.winner === null
      ? "千日手（引き分け）"
      : result.winner === result.playerOwner
        ? "あなたの勝ち"
        : "あなたの負け"
    : "結果未確定";

  const hasEvaluation = !!result?.showEvaluationGraph && result.evaluations.length > 0;
  const selectedDetail = activeDetail === "evaluation" && hasEvaluation ? "evaluation" : "formations";
  return (
    <main className="viewport-screen result-screen bg-zinc-950 text-zinc-100">
      <div className="result-shell">
        <header className="result-summary">
          <p className="text-xs tracking-[0.25em] text-amber-200/60">一局を、次の一手へ。</p>
          <h1 className="text-xl font-semibold">対局結果</h1>
          <div className="result-verdict">
            <span className="text-xs text-zinc-500">勝敗</span>
            <strong>{resultText}</strong>
          </div>
          {result?.reason === "perpetual-check" && <p className="text-xs text-zinc-400">連続王手の千日手により対局終了</p>}
          <Link href="/collection" className="text-xs text-amber-200 underline decoration-amber-300/30 underline-offset-4">戦法・囲い図鑑を見る →</Link>
        </header>
        <section className="result-details" aria-label="対局の振り返り">
          <nav className="screen-tabs" aria-label="振り返り項目">
            {hasEvaluation && <button aria-pressed={selectedDetail === "evaluation"} onClick={() => setActiveDetail("evaluation")}>評価値</button>}
            <button aria-pressed={selectedDetail === "formations"} onClick={() => setActiveDetail("formations")}>戦法・囲い</button>
          </nav>
          <div className="result-detail-body">
            {selectedDetail === "evaluation" && result ? <EvaluationGraph entries={result.evaluations} compact />
              : result ? <FormationLog records={result.formations} playerOwner={result.playerOwner} />
                : <div className="result-empty"><span aria-hidden="true">録</span><p>対局が終わると、ここで評価値や使った形を振り返れます。</p></div>}
          </div>
        </section>
        <footer className="result-actions">
          <button onClick={handleRematch} className="screen-primary-button">もう一度対局する</button>
          <button onClick={handleBackToSettings} className="screen-secondary-button">設定に戻る</button>
        </footer>
      </div>
    </main>
  );
}
