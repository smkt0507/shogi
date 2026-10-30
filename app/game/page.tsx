"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import ControlsPanel from "../components/ControlsPanel";
import HandsPanel from "../components/HandsPanel";
import KifuPanel from "../components/KifuPanel";
import PromotionModal from "../components/PromotionModal";
import ShogiBoard from "../components/ShogiBoard";
import StatusPanel from "../components/StatusPanel";
import HintPanel from "../components/HintPanel";
import EvaluationGraph from "../components/EvaluationGraph";
import MobileGameTools from "../components/MobileGameTools";
import FormationCutIn from "../components/FormationCutIn";
import FormationLog from "../components/FormationLog";
import { parseSettings, SETTINGS_KEY, RESULT_KEY } from "../lib/settings";
import { useLocalStorageValue } from "../lib/useLocalStorageValue";
import { writeStoredValue } from "../lib/storage";
import { opponentOf } from "../lib/rules";
import { useGame } from "../lib/useGame";
import { useDesktopLayout } from "../lib/useDesktopLayout";
import { useFormations } from "../lib/useFormations";
import { prepareFormationSound } from "../lib/formation-sound";
import type { GameSettings } from "../lib/types";

export default function GamePage() {
  const router = useRouter();
  const saved = useLocalStorageValue(SETTINGS_KEY);
  const settings = useMemo(() => parseSettings(saved ?? null), [saved]);

  useEffect(() => {
    if (saved !== undefined && !settings) router.replace("/settings");
  }, [saved, settings, router]);

  return settings ? <Game settings={settings} /> : null;
}

function Game({ settings: initialSettings }: { settings: GameSettings }) {
  // Settings are fixed for this game even if another tab changes its defaults.
  const [settings] = useState(initialSettings);
  const { playerOwner, showHints, showEvaluationGraph } = settings;
  const router = useRouter();
  const isDesktop = useDesktopLayout();
  const [leftInfo, setLeftInfo] = useState("status");
  const [rightInfo, setRightInfo] = useState("kifu");
  const {
    state,
    dispatch,
    aiSearch,
    hintSearch,
    isPlayerTurn,
    legalTargets,
    handleSquareClick,
    handleDropSelect,
    resetGame,
  } = useGame(settings);
  const activeFormation = useFormations(
    state.formations,
    state.session,
    settings,
  );
  const {
    board,
    hands,
    turn,
    selected,
    selectedDrop,
    pendingPromotion,
    lastMove,
    outcome,
    checkStatus,
    evaluations,
  } = state;
  const aiOwner = opponentOf(playerOwner);
  const aiThinking = aiSearch.loading;
  const hintMove = hintSearch.move;
  const playerLabel = playerOwner === "b" ? "先手（あなた）" : "後手（あなた）";
  useEffect(() => {
    writeStoredValue(RESULT_KEY, null);
  }, []);
  useEffect(() => {
    if (!outcome) return;
    writeStoredValue(
      RESULT_KEY,
      JSON.stringify({
        ...outcome,
        playerOwner,
        evaluations,
        showEvaluationGraph,
        formations: state.formations.map(({ id, owner, ply }) => ({
          id,
          owner,
          ply,
        })),
      }),
    );
    router.push("/result");
  }, [
    outcome,
    playerOwner,
    evaluations,
    showEvaluationGraph,
    state.formations,
    router,
  ]);
  const handleBackToSettings = useCallback(
    () => router.push("/settings"),
    [router],
  );
  const statusPanel = (
    <StatusPanel
      turn={turn}
      outcome={outcome}
      checkStatus={checkStatus}
      playerOwner={playerOwner}
    />
  );
  const hintPanel = showHints ? (
    <HintPanel
      board={board}
      move={hintMove}
      playerOwner={playerOwner}
      isPlayerTurn={isPlayerTurn}
      loading={hintSearch.loading}
      onRetry={hintSearch.retry}
    />
  ) : null;
  const evaluationPanel = showEvaluationGraph ? (
    <EvaluationGraph entries={evaluations} compact />
  ) : null;
  const kifuPanel = (
    <KifuPanel
      moves={state.history}
      evaluations={evaluations}
      className={isDesktop ? "game-kifu" : ""}
      heightClassName={isDesktop ? "game-kifu-list" : ""}
    />
  );
  const formationPanel = (
    <FormationLog records={state.formations} playerOwner={playerOwner} />
  );
  const searchError = aiSearch.error ? (
    <div
      role="alert"
      className="rounded-xl bg-rose-950/50 p-3 text-sm text-rose-200"
    >
      <p>{aiSearch.error}</p>
      <button
        onClick={aiSearch.retry}
        className="mt-2 rounded-lg border border-rose-700 px-3 py-1"
      >
        再試行
      </button>
    </div>
  ) : null;

  return (
    <div
      className="game-screen bg-zinc-950 text-zinc-100"
      onPointerDown={
        settings.formationSound && settings.showFormationEffects
          ? prepareFormationSound
          : undefined
      }
      onKeyDown={
        settings.formationSound && settings.showFormationEffects
          ? prepareFormationSound
          : undefined
      }
    >
      <div className="game-layout">
        {!isDesktop && (
          <header className="game-mobile-status">
            <div className="flex items-center justify-between gap-3">
              <div>
                <h1 className="text-xs text-zinc-400">
                  将棋AI対戦 · {state.history.length}手
                </h1>
                <p className="mt-1 text-sm font-semibold" role="status">
                  {isPlayerTurn
                    ? "あなたの手番"
                    : aiThinking
                      ? "AI思考中…"
                      : "AIの手番"}
                  <span className="ml-2 text-xs font-normal text-zinc-400">
                    {turn === "b" ? "▲先手" : "△後手"}
                  </span>
                </p>
              </div>
              {(checkStatus.b || checkStatus.w) && (
                <span className="rounded-lg bg-rose-950 px-3 py-1 text-xs text-rose-300">
                  王手
                </span>
              )}
            </div>
            {searchError}
          </header>
        )}
        {isDesktop && (
          <aside className="game-sidebar game-sidebar-left">
            <div className="game-left-info">
              {hintPanel && (
                <nav className="screen-tabs" aria-label="対局ガイド">
                  <button aria-pressed={leftInfo === "status"} onClick={() => setLeftInfo("status")}>状況</button>
                  <button aria-pressed={leftInfo === "hint"} onClick={() => setLeftInfo("hint")}>ヒント</button>
                </nav>
              )}
              {leftInfo === "hint" && hintPanel ? hintPanel : statusPanel}
            </div>
            {searchError}
            <ControlsPanel
              onReset={resetGame}
              onBackToSettings={handleBackToSettings}
            />
          </aside>
        )}

        <main className="game-board-column" aria-label="将棋盤と持ち駒">
          <HandsPanel
            title="AIの持ち駒"
            hands={hands}
            owner={aiOwner}
            compact
          />

          <div className="relative">
            <ShogiBoard
              board={board}
              selected={selected}
              legalTargets={legalTargets}
              turn={turn}
              lastMove={lastMove}
              playerOwner={playerOwner}
              hintMove={hintMove}
              formationSquares={activeFormation?.squares}
              onSquareClick={handleSquareClick}
            />
            {aiThinking && (
              <div className="absolute inset-0 z-20 flex items-center justify-center">
                <div className="rounded-2xl bg-black/70 px-6 py-4 text-sm text-zinc-100 shadow-xl">
                  <div className="text-base font-semibold">AI思考中…</div>
                  <div className="mt-1 text-xs text-zinc-300">
                    しばらくお待ちください
                  </div>
                </div>
              </div>
            )}
            {activeFormation && (
              <FormationCutIn
                key={`${state.session}-${activeFormation.owner}-${activeFormation.id}`}
                event={activeFormation}
                playerOwner={playerOwner}
              />
            )}
          </div>
          <HandsPanel
            title={playerLabel}
            hands={hands}
            owner={playerOwner}
            compact
            selectable
            selectedDrop={selectedDrop}
            onSelect={handleDropSelect}
            disabled={turn !== playerOwner}
          />
        </main>

        {isDesktop && (
          <aside className="game-sidebar game-sidebar-right">
            <nav className="screen-tabs" aria-label="対局記録の切り替え">
              <button aria-pressed={rightInfo === "formations"} onClick={() => setRightInfo("formations")}>戦法</button>
              {evaluationPanel && <button aria-pressed={rightInfo === "evaluation"} onClick={() => setRightInfo("evaluation")}>評価</button>}
              <button aria-pressed={rightInfo === "kifu"} onClick={() => setRightInfo("kifu")}>棋譜</button>
            </nav>
            <div className="game-info-panel">
              {rightInfo === "formations" ? formationPanel : rightInfo === "evaluation" && evaluationPanel ? evaluationPanel : kifuPanel}
            </div>
          </aside>
        )}
        {!isDesktop && (
          <MobileGameTools
            hint={hintPanel}
            evaluation={evaluationPanel}
            kifu={kifuPanel}
            status={statusPanel}
            formations={formationPanel}
            onReset={resetGame}
            onBackToSettings={handleBackToSettings}
          />
        )}

        {pendingPromotion && (
          <PromotionModal
            onPromote={() => dispatch({ type: "promote", promote: true })}
            onDecline={() => dispatch({ type: "promote", promote: false })}
          />
        )}
      </div>
    </div>
  );
}
