import { chooseLocalAiMove } from "./search";
import type { Board, Hands, Owner } from "./types";

self.onmessage = (
  event: MessageEvent<{
    board: Board;
    hands: Hands;
    maxDepth: number;
    timeMs: number;
    owner: Owner;
  }>,
) => {
  const { board, hands, maxDepth, timeMs, owner } = event.data;
  try {
    self.postMessage({
      move: chooseLocalAiMove(board, hands, maxDepth, timeMs, owner),
    });
  } catch {
    self.postMessage({ error: "指し手の探索に失敗しました。" });
  }
};
