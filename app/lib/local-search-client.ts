import type { Board, Hands, Move, Owner } from "./types";

export const searchInWorker = (
  board: Board,
  hands: Hands,
  maxDepth: number,
  timeMs: number,
  owner: Owner,
  signal?: AbortSignal,
) =>
  new Promise<Move | null>((resolve, reject) => {
    signal?.throwIfAborted();
    const worker = new Worker(new URL("./search.worker.ts", import.meta.url), {
      type: "module",
    });
    const cleanup = () => {
      clearTimeout(timer);
      signal?.removeEventListener("abort", onAbort);
      worker.terminate();
    };
    const onAbort = () => {
      cleanup();
      reject(signal?.reason ?? new DOMException("Aborted", "AbortError"));
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("ローカルAIの応答がありません。"));
    }, timeMs + 5000);
    signal?.addEventListener("abort", onAbort, { once: true });
    worker.onmessage = (
      event: MessageEvent<{ move: Move | null; error?: string }>,
    ) => {
      cleanup();
      if (event.data.error) reject(new Error(event.data.error));
      else resolve(event.data.move);
    };
    worker.onerror = () => {
      cleanup();
      reject(new Error("ローカルAIを起動できませんでした。"));
    };
    try {
      worker.postMessage({ board, hands, maxDepth, timeMs, owner });
    } catch (error) {
      cleanup();
      reject(error);
    }
  });
