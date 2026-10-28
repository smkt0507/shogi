import { NextResponse } from "next/server";
import { access, constants } from "node:fs/promises";
import { parseAiRequest } from "@/app/lib/validation";
import { resolveLegalMove } from "@/app/lib/rules";
import { runEngine } from "@/app/lib/server/engine";
import { EngineBusyError, EnginePool } from "@/app/lib/server/enginePool";
import { readJsonBody, RequestBodyError } from "@/app/lib/server/request";

export const runtime = "nodejs";
const engines = new EnginePool();

export async function POST(request: Request) {
  try {
    const body = parseAiRequest(await readJsonBody(request));
    if (!body)
      return NextResponse.json(
        { error: "盤面・持ち駒・探索条件を確認してください。" },
        { status: 400 },
      );
    const enabled =
      process.env.USI_EVAL_ENABLED === "true" ||
      process.env.USI_EVAL_ENABLED === "1";
    if (body.mode === "evaluate" && !enabled)
      return NextResponse.json({ score: null, disabled: true });
    const enginePath =
      process.env.YANEURAOU_PATH || process.env.SHOGI_ENGINE_PATH;
    if (!enginePath)
      return NextResponse.json(
        { error: "エンジンが設定されていません。" },
        { status: 503 },
      );
    try {
      await access(enginePath, constants.X_OK);
    } catch {
      return NextResponse.json(
        { error: "エンジンを利用できません。" },
        { status: 503 },
      );
    }
    const result = await engines.run(
      () => runEngine(enginePath, body, request.signal),
      request.signal,
    );
    if (body.mode === "evaluate") {
      if (result.score === null)
        return NextResponse.json(
          { error: "評価値を取得できませんでした。" },
          { status: 502 },
        );
      return NextResponse.json({ score: result.score });
    }
    if (!result.move) return NextResponse.json({ move: null });
    const move = resolveLegalMove(
      body.board,
      body.hands,
      body.turn,
      result.move,
    );
    if (!move)
      return NextResponse.json(
        { error: "エンジンが不正な指し手を返しました。" },
        { status: 502 },
      );
    return NextResponse.json({ move });
  } catch (error) {
    if (request.signal.aborted) return new Response(null, { status: 499 });
    if (error instanceof RequestBodyError)
      return NextResponse.json(
        { error: error.message },
        { status: error.status },
      );
    if (error instanceof EngineBusyError)
      return NextResponse.json(
        { error: "解析が混み合っています。" },
        { status: 503 },
      );
    console.error(
      "Shogi engine request failed:",
      error instanceof Error ? error.message : "unknown error",
    );
    return NextResponse.json(
      { error: "エンジンの応答に失敗しました。" },
      { status: 502 },
    );
  }
}
