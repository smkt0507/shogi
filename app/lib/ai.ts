import type { Board, Hands, Owner, PositionEvaluation } from "./types";
import { localEvaluation, scoreForSente } from "./analysis";
import { resolveLegalMove } from "./rules";
import { chooseLocalAiMove } from "./search";

export {
  chooseLocalAiMove,
  expandMovesForSearch,
  minimax,
  orderMoves,
} from "./search";

// A disabled capability is stable for the lifetime of the loaded application.
let engineEvaluationDisabled = false;

const requestSignal = (signal?: AbortSignal) => {
  const timeout = AbortSignal.timeout(25000);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
};

export const chooseAiMove = async (
  board: Board,
  hands: Hands,
  maxDepth: number,
  timeMs: number,
  owner: Owner = "w",
  signal?: AbortSignal,
) => {
  signal?.throwIfAborted();
  if (typeof window !== "undefined") {
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board,
          hands,
          turn: owner,
          depth: maxDepth,
          timeMs,
        }),
        signal: requestSignal(signal),
      });
      if (response.ok) {
        const data = (await response.json()) as { move?: unknown };
        const move = resolveLegalMove(board, hands, owner, data.move);
        if (move) return move;
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      // ignore and fallback
    }
  }
  signal?.throwIfAborted();
  if (typeof Worker !== "undefined") {
    try {
      const { searchInWorker } = await import("./local-search-client");
      return await searchInWorker(
        board,
        hands,
        maxDepth,
        timeMs,
        owner,
        signal,
      );
    } catch (error) {
      if (signal?.aborted) throw error;
      // A blocked or failed Worker still gets the bounded compatibility search.
    }
  }
  // Compatibility path for environments without Web Workers; keep it short.
  return chooseLocalAiMove(
    board,
    hands,
    Math.min(maxDepth, 2),
    Math.min(timeMs, 100),
    owner,
  );
};

export const evaluatePosition = async (
  board: Board,
  hands: Hands,
  turn: Owner,
  depth: number,
  timeMs: number,
  signal?: AbortSignal,
): Promise<PositionEvaluation> => {
  signal?.throwIfAborted();
  if (
    process.env.NEXT_PUBLIC_EVAL_MODE === "local" ||
    engineEvaluationDisabled
  ) {
    return localEvaluation(board, hands, 0);
  }

  if (typeof window !== "undefined") {
    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          board,
          hands,
          turn,
          depth,
          timeMs,
          mode: "evaluate",
        }),
        signal: requestSignal(signal),
      });
      if (response.ok) {
        const data = (await response.json()) as {
          score?: number | null;
          disabled?: boolean;
        };
        if (data.disabled === true) engineEvaluationDisabled = true;
        if (typeof data.score === "number" && Number.isFinite(data.score)) {
          return { score: scoreForSente(data.score, turn), source: "engine" };
        }
      }
    } catch (error) {
      if (signal?.aborted) throw error;
      // ignore and fallback
    }
  }

  return localEvaluation(board, hands, 0);
};
