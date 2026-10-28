import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import path from "node:path";
import type { AiRequest } from "../validation";
import { positionKey } from "../position";
import { parseUsiMove, parseUsiScore } from "../usi";

export async function runEngine(
  enginePath: string,
  request: AiRequest,
  signal: AbortSignal,
) {
  signal.throwIfAborted();
  const engine = spawn(enginePath, [], {
    cwd: path.dirname(enginePath),
    stdio: ["pipe", "pipe", "pipe"],
  });
  const lines = createInterface({ input: engine.stdout });
  let failure: Error | null = null;
  let score: number | null = null;
  let stderr = "";
  let closed = false;
  let pending: {
    pattern: RegExp;
    resolve: (line: string) => void;
    reject: (error: Error) => void;
  } | null = null;
  const exited = new Promise<void>((resolve) =>
    engine.once("close", () => {
      closed = true;
      resolve();
    }),
  );
  const fail = (error: Error) => {
    failure = error;
    pending?.reject(error);
  };
  const onAbort = () => fail(new DOMException("Aborted", "AbortError"));
  engine.on("error", fail);
  engine.stdin.on("error", fail);
  engine.stdout.on("error", fail);
  engine.stderr.on("data", (chunk) => {
    stderr = (stderr + chunk.toString()).slice(-8192);
  });
  engine.on("exit", (code) =>
    fail(new Error(`engine exited (${code}): ${stderr}`)),
  );
  lines.on("line", (line) => {
    const parsed = parseUsiScore(line);
    if (parsed !== null) score = parsed;
    if (pending?.pattern.test(line)) pending.resolve(line);
  });
  signal.addEventListener("abort", onAbort, { once: true });

  const send = (command: string) => {
    if (failure) throw failure;
    signal.throwIfAborted();
    engine.stdin.write(`${command}\n`);
  };
  const command = (value: string, pattern: RegExp, timeout: number) =>
    new Promise<string>((resolve, reject) => {
      const timer = setTimeout(
        () => finish(new Error("engine response timeout")),
        timeout,
      );
      const finish = (error?: Error, line = "") => {
        clearTimeout(timer);
        pending = null;
        if (error) reject(error);
        else resolve(line);
      };
      pending = {
        pattern,
        resolve: (line) => finish(undefined, line),
        reject: (error) => finish(error),
      };
      try {
        send(value);
      } catch (error) {
        finish(
          error instanceof Error ? error : new Error("engine unavailable"),
        );
      }
    });

  const moveTime =
    request.mode === "evaluate"
      ? Math.min(Math.max(request.timeMs, 800), 2000)
      : Math.min(request.timeMs, 2000);
  try {
    await command("usi", /^usiok\b/, 8000);
    send(
      `setoption name USI_Hash value ${request.mode === "evaluate" ? 16 : 64}`,
    );
    send("setoption name Threads value 1");
    if (request.mode === "evaluate")
      send("setoption name USI_OwnBook value false");
    await command("isready", /^readyok\b/, 8000);
    send(
      `position sfen ${positionKey(request.board, request.hands, request.turn)} 1`,
    );
    const best = await command(
      `go depth ${request.depth} movetime ${moveTime}`,
      /^bestmove\s+/,
      moveTime + 8000,
    );
    return { move: parseUsiMove(best.split(/\s+/)[1] ?? ""), score };
  } finally {
    signal.removeEventListener("abort", onAbort);
    lines.close();
    // Keep the concurrency slot until the child has actually exited.
    if (!closed) {
      const forceKill = setTimeout(() => engine.kill("SIGKILL"), 250);
      forceKill.unref();
      engine.kill();
      await exited;
      clearTimeout(forceKill);
    }
  }
}
