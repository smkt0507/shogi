"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import type { Dispatch } from "react";
import type {
  Board,
  GameSettings,
  Hands,
  Move,
  Owner,
  PieceType,
} from "./types";
import { createGameState, gameReducer } from "./game";
import type { GameAction, GameState } from "./game";
import { chooseAiMove, evaluatePosition } from "./ai";

function useMoveSearch(
  board: Board,
  hands: Hands,
  turn: Owner,
  settings: GameSettings,
  enabled: boolean,
  delay: number,
) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{
    board: Board;
    attempt: number;
    move: Move | null;
    error: string | null;
  } | null>(null);
  const { aiDepth, aiTimeMs } = settings;
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      void chooseAiMove(
        board,
        hands,
        aiDepth,
        aiTimeMs,
        turn,
        controller.signal,
      )
        .then((move) => {
          if (!controller.signal.aborted)
            setResult({
              board,
              attempt,
              move,
              error: move ? null : "指し手を取得できませんでした。",
            });
        })
        .catch(() => {
          if (!controller.signal.aborted)
            setResult({
              board,
              attempt,
              move: null,
              error: "AIの解析に失敗しました。もう一度お試しください。",
            });
        });
    }, delay);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [board, hands, turn, aiDepth, aiTimeMs, enabled, delay, attempt]);
  const current =
    enabled && result?.board === board && result.attempt === attempt
      ? result
      : null;
  const retry = useCallback(() => setAttempt((previous) => previous + 1), []);
  return {
    move: current?.move ?? null,
    error: current?.error ?? null,
    loading: enabled && !current,
    retry,
  };
}

function usePositionEvaluations(
  state: GameState,
  settings: GameSettings,
  dispatch: Dispatch<GameAction>,
) {
  const queue = useRef<Promise<void>>(Promise.resolve());
  const controller = useRef<AbortController | null>(null);
  const { board, hands, turn, session, outcome } = state;
  const ply = state.history.length;
  const { aiDepth, aiTimeMs } = settings;
  useEffect(() => {
    const current = new AbortController();
    controller.current = current;
    queue.current = Promise.resolve();
    return () => current.abort();
  }, [session]);
  useEffect(() => {
    const signal = controller.current?.signal;
    if (outcome || !signal || signal.aborted) return;
    queue.current = queue.current
      .then(async () => {
        signal.throwIfAborted();
        const evaluation = await evaluatePosition(
          board,
          hands,
          turn,
          Math.min(aiDepth + 2, 8),
          Math.max(aiTimeMs, 800),
          signal,
        );
        if (!signal.aborted)
          dispatch({ type: "evaluation", session, ply, evaluation });
      })
      .catch(() => {
        // Every ply already has a local score; cancellation leaves it intact.
      });
  }, [board, hands, turn, session, ply, outcome, aiDepth, aiTimeMs, dispatch]);
}

export function useGame(settings: GameSettings) {
  const [state, dispatch] = useReducer(
    gameReducer,
    settings.playerOwner,
    createGameState,
  );
  const isPlayerTurn = state.turn === settings.playerOwner && !state.outcome;
  const aiSearch = useMoveSearch(
    state.board,
    state.hands,
    state.turn,
    settings,
    !isPlayerTurn && !state.outcome,
    150,
  );
  const hintSearch = useMoveSearch(
    state.board,
    state.hands,
    state.turn,
    settings,
    isPlayerTurn && settings.showHints,
    0,
  );
  const { session } = state;
  const ply = state.history.length;
  useEffect(() => {
    if (aiSearch.move)
      dispatch({ type: "play", session, ply, move: aiSearch.move });
  }, [aiSearch.move, session, ply]);
  usePositionEvaluations(state, settings, dispatch);
  const legalTargets = useMemo(
    () =>
      new Map(
        state.legalMoves.map((move) => [`${move.to.r}-${move.to.c}`, move]),
      ),
    [state.legalMoves],
  );
  const handleSquareClick = useCallback(
    (r: number, c: number) => dispatch({ type: "square", r, c }),
    [],
  );
  const handleDropSelect = useCallback(
    (piece: PieceType) => dispatch({ type: "drop", piece }),
    [],
  );
  const resetGame = useCallback(() => dispatch({ type: "reset" }), []);
  return {
    state,
    dispatch,
    aiSearch,
    hintSearch,
    isPlayerTurn,
    legalTargets,
    handleSquareClick,
    handleDropSelect,
    resetGame,
  };
}
