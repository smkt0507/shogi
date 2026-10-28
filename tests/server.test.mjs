import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
const loadModule = createRequire(import.meta.url);
const load = (name) =>
  loadModule(path.join(process.env.SHOGI_TEST_LIB_DIR, name));
const { initialBoard, emptyHands } = load("board.js");
const { parseAiRequest } = load("validation.js");
const { parseUsiMove, parseUsiScore } = load("usi.js");
const { EnginePool, EngineBusyError } = load("server/enginePool.js");
const { runEngine } = load("server/engine.js");
const { readJsonBody } = load("server/request.js");
const { parseResult, parseSettings } = load("settings.js");
const request = () => ({
  board: initialBoard(),
  hands: emptyHands(),
  turn: "b",
  depth: 2,
  timeMs: 400,
  mode: "bestmove",
});
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

test("AI requests reject malformed positions and non-finite/unbounded search options", () => {
  assert.ok(parseAiRequest(request()));
  for (const value of [
    null,
    [],
    {},
    { ...request(), board: [] },
    { ...request(), hands: null },
    { ...request(), turn: "x" },
    { ...request(), depth: Infinity },
    { ...request(), depth: 99 },
    { ...request(), timeMs: NaN },
    { ...request(), timeMs: -1 },
    { ...request(), mode: "shell" },
  ])
    assert.equal(parseAiRequest(value), null);
  let body = request();
  body.board[0][4] = null;
  assert.equal(parseAiRequest(body), null);
  body = request();
  body.board[0][4].promoted = true;
  assert.equal(parseAiRequest(body), null);
  body = request();
  body.hands.b.K = 1;
  assert.equal(parseAiRequest(body), null);
  body = request();
  body.hands.b.P = 18;
  assert.equal(parseAiRequest(body), null);
});

test("JSON input is capped and malformed JSON is a client error", async () => {
  assert.deepEqual(
    await readJsonBody(
      new Request("http://localhost", { method: "POST", body: '{"ok":true}' }),
    ),
    { ok: true },
  );
  await assert.rejects(
    readJsonBody(
      new Request("http://localhost", { method: "POST", body: "{" }),
    ),
    { status: 400 },
  );
  await assert.rejects(
    readJsonBody(
      new Request("http://localhost", {
        method: "POST",
        body: '"' + "a".repeat(70000) + '"',
      }),
    ),
    { status: 413 },
  );
});

test("USI parsing rejects invalid coordinates, illegal drop kinds and trailing garbage", () => {
  assert.deepEqual(parseUsiMove("7g7f"), {
    from: { r: 6, c: 2 },
    to: { r: 5, c: 2 },
    promotion: "none",
  });
  assert.deepEqual(parseUsiMove("P*5e"), {
    drop: "P",
    to: { r: 4, c: 4 },
    promotion: "none",
  });
  for (const move of [
    "resign",
    "win",
    "none",
    "7g0f",
    "7j7f",
    "K*5e",
    "P*5e+",
    "7g7f garbage",
  ])
    assert.equal(parseUsiMove(move), null);
  assert.equal(parseUsiScore("info depth 5 score cp -120 pv 7g7f"), -120);
  assert.equal(parseUsiScore("info depth 5 multipv 2 score cp 900"), null);
  assert.equal(parseUsiScore("info depth 5 score cp 900 lowerbound"), null);
  assert.equal(parseUsiScore("info score mate -3"), -99997);
  assert.equal(parseUsiScore("info score mate +"), 100000);
});

test("engine pool bounds concurrency and releases slots after failures", async () => {
  const pool = new EnginePool(2);
  let active = 0;
  let peak = 0;
  const jobs = Array.from({ length: 6 }, (_, index) =>
    pool.run(async () => {
      active++;
      peak = Math.max(peak, active);
      try {
        await delay(10);
        if (index === 0) throw new Error("expected");
        return index;
      } finally {
        active--;
      }
    }, new AbortController().signal),
  );
  const results = await Promise.allSettled(jobs);
  assert.equal(peak, 2);
  assert.equal(active, 0);
  assert.equal(
    results.filter((result) => result.status === "fulfilled").length,
    5,
  );
});

test("queued engine requests can abort, time out or be rejected when full", async () => {
  const pool = new EnginePool(1, 1, 20);
  let release;
  const running = pool.run(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
    new AbortController().signal,
  );
  await delay(0);
  const controller = new AbortController();
  const queued = pool.run(
    async () => assert.fail("aborted request started"),
    controller.signal,
  );
  await assert.rejects(
    pool.run(async () => {}, new AbortController().signal),
    EngineBusyError,
  );
  controller.abort();
  await assert.rejects(queued, { name: "AbortError" });
  await assert.rejects(
    pool.run(async () => {}, new AbortController().signal),
    EngineBusyError,
  );
  release();
  await running;
  assert.equal(
    await pool.run(async () => 42, new AbortController().signal),
    42,
  );
});

const withEngine = async (script, run) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "shogi-fake-engine-"));
  const engine = path.join(dir, "engine");
  fs.writeFileSync(engine, "#!/usr/bin/env node\n" + script);
  fs.chmodSync(engine, 0o755);
  try {
    await run(engine, dir);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
};

test("engine handshake captures only the main exact score and cleans up its child", async () => {
  await withEngine(
    `const rl = require('node:readline').createInterface({ input: process.stdin });
    rl.on('line', line => {
      if (line === 'usi') console.log('usiok');
      if (line === 'isready') console.log('readyok');
      if (line.startsWith('go ')) {
        console.log('info depth 2 score cp 130');
        console.log('info multipv 2 score cp 999');
        console.log('info score cp 800 lowerbound');
        console.log('bestmove 7g7f');
      }
    });`,
    async (engine) => {
      const result = await runEngine(
        engine,
        parseAiRequest(request()),
        new AbortController().signal,
      );
      assert.equal(result.score, 130);
      assert.equal(result.move.to.r, 5);
    },
  );
});

test("spawn errors reject promptly instead of waiting through protocol timeouts", async () => {
  const start = Date.now();
  await assert.rejects(
    runEngine(
      "/nonexistent/shogi-engine",
      parseAiRequest(request()),
      new AbortController().signal,
    ),
  );
  assert.ok(Date.now() - start < 2000);
});

test("aborting an engine kills even a child that ignores SIGTERM", async () => {
  await withEngine(
    `require('node:fs').writeFileSync(require('node:path').join(__dirname, 'pid'), String(process.pid));
    process.on('SIGTERM', () => {}); setInterval(() => {}, 1000);`,
    async (engine, dir) => {
      const controller = new AbortController();
      const job = runEngine(
        engine,
        parseAiRequest(request()),
        controller.signal,
      );
      const rejected = assert.rejects(job, { name: "AbortError" });
      for (let i = 0; i < 200 && !fs.existsSync(path.join(dir, "pid")); i++)
        await delay(5);
      const pid = Number(fs.readFileSync(path.join(dir, "pid"), "utf8"));
      controller.abort();
      await rejected;
      assert.throws(() => process.kill(pid, 0), { code: "ESRCH" });
    },
  );
});

test("saved results sanitize invalid or non-contiguous evaluation histories", () => {
  assert.equal(parseResult("null"), null);
  assert.equal(parseResult("[]"), null);
  assert.equal(parseSettings("[]"), null);
  const result = parseResult(
    JSON.stringify({
      winner: null,
      playerOwner: "w",
      reason: "repetition",
      showEvaluationGraph: "true",
      evaluations: [
        { ply: 0, score: 0, source: "local" },
        { ply: 3, score: 200, source: "engine" },
      ],
    }),
  );
  assert.equal(result.evaluations.length, 1);
  assert.equal(result.showEvaluationGraph, false);
});
