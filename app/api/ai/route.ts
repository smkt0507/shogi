import { NextResponse } from "next/server";
import { spawn } from "node:child_process";
import readline from "node:readline";
import path from "node:path";
import fs from "node:fs";
import type { Board, Hands, Move, Owner, PieceType } from "@/app/lib/types";

export const runtime = "nodejs";

const pieceOrder: PieceType[] = ["R", "B", "G", "S", "N", "L", "P"];
const rankLetters = "abcdefghi";

const toSfenBoard = (board: Board) => {
  const ranks: string[] = [];
  for (let r = 0; r < 9; r += 1) {
    let empty = 0;
    let line = "";
    for (let c = 0; c < 9; c += 1) {
      const cell = board[r][c];
      if (!cell) {
        empty += 1;
        continue;
      }
      if (empty > 0) {
        line += String(empty);
        empty = 0;
      }
      const char = cell.owner === "b" ? cell.type : cell.type.toLowerCase();
      line += cell.promoted ? `+${char}` : char;
    }
    if (empty > 0) line += String(empty);
    ranks.push(line || "9");
  }
  return ranks.join("/");
};

const toSfenHands = (hands: Hands) => {
  let out = "";
  for (const type of pieceOrder) {
    const count = hands.b[type];
    if (count > 0) out += count > 1 ? `${count}${type}` : type;
  }
  for (const type of pieceOrder) {
    const count = hands.w[type];
    if (count > 0) {
      const lower = type.toLowerCase();
      out += count > 1 ? `${count}${lower}` : lower;
    }
  }
  return out === "" ? "-" : out;
};

const toSfen = (board: Board, hands: Hands, turn: Owner) =>
  `${toSfenBoard(board)} ${turn} ${toSfenHands(hands)} 1`;

const parseSquare = (fileChar: string, rankChar: string) => {
  const file = Number(fileChar);
  const r = rankLetters.indexOf(rankChar);
  const c = 9 - file;
  return { r, c };
};

const parseUsiMove = (move: string): Move | null => {
  if (!move || move === "resign" || move === "win" || move === "none") return null;
  if (move.includes("*")) {
    const [pieceChar, square] = move.split("*");
    if (!square || square.length < 2) return null;
    const drop = pieceChar.toUpperCase() as PieceType;
    const to = parseSquare(square[0], square[1]);
    return { drop, to, promotion: "none" };
  }

  const promoted = move.endsWith("+");
  const clean = promoted ? move.slice(0, -1) : move;
  if (clean.length < 4) return null;
  const from = parseSquare(clean[0], clean[1]);
  const to = parseSquare(clean[2], clean[3]);
  return {
    from,
    to,
    promotion: promoted ? "must" : "none",
  };
};

const waitForMatch = (
  rl: readline.Interface,
  pattern: RegExp,
  timeoutMs: number
) =>
  new Promise<string>((resolve, reject) => {
    const onLine = (line: string) => {
      if (pattern.test(line)) {
        cleanup();
        resolve(line);
      }
    };
    const timer = setTimeout(() => {
      cleanup();
      reject(new Error("timeout"));
    }, timeoutMs);
    const cleanup = () => {
      clearTimeout(timer);
      rl.off("line", onLine);
    };
    rl.on("line", onLine);
  });

const sendLine = (proc: ReturnType<typeof spawn>, line: string) => {
  proc.stdin?.write(`${line}\n`);
};

export async function POST(request: Request) {
  const enginePath =
    process.env.YANEURAOU_PATH || process.env.SHOGI_ENGINE_PATH || "";
  if (!enginePath) {
    return NextResponse.json(
      { error: "YANEURAOU_PATHが未設定です。" },
      { status: 400 }
    );
  }
  if (!fs.existsSync(enginePath)) {
    return NextResponse.json(
      { error: "エンジンの実行ファイルが見つかりません。" },
      { status: 400 }
    );
  }
  try {
    fs.accessSync(enginePath, fs.constants.X_OK);
  } catch {
    return NextResponse.json(
      { error: "エンジンの実行権限がありません。" },
      { status: 400 }
    );
  }

  const body = (await request.json()) as {
    board: Board;
    hands: Hands;
    turn: Owner;
    depth?: number;
    timeMs?: number;
  };

  const sfen = toSfen(body.board, body.hands, body.turn);
  const depth = Math.max(1, body.depth ?? 5);
  const timeMs = Math.max(200, body.timeMs ?? 1000);
  const depthScale = Math.max(1, depth - 4);
  const moveTime = Math.min(timeMs * depthScale, 20000);

  const engineDir = path.dirname(enginePath);
  const engine = spawn(enginePath, [], {
    stdio: ["pipe", "pipe", "pipe"],
    cwd: engineDir,
  });
  const rl = readline.createInterface({ input: engine.stdout });
  let stderr = "";
  let spawnError: string | null = null;
  let exitCode: number | null = null;
  engine.stderr?.on("data", (chunk) => {
    stderr += chunk.toString();
  });
  engine.on("error", (error) => {
    spawnError = error.message;
  });
  engine.on("exit", (code) => {
    exitCode = code;
  });

  try {
    sendLine(engine, "usi");
    await waitForMatch(rl, /^usiok/, 5000);
    sendLine(engine, "isready");
    await waitForMatch(rl, /^readyok/, 5000);
    sendLine(engine, `position sfen ${sfen}`);
    sendLine(engine, `go movetime ${moveTime}`);
    const bestLine = await waitForMatch(rl, /^bestmove\s+/, moveTime + 5000);
    const best = bestLine.split(/\s+/)[1] ?? "";
    const move = parseUsiMove(best);
    sendLine(engine, "quit");
    engine.kill();
    return NextResponse.json({ move });
  } catch {
    sendLine(engine, "quit");
    engine.kill();
    return NextResponse.json(
      {
        error: "エンジンの応答に失敗しました。",
        detail:
          stderr.trim() ||
          spawnError ||
          (exitCode !== null ? `exit code: ${exitCode}` : "no stderr"),
      },
      { status: 500 }
    );
  } finally {
    rl.close();
  }
}
