import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";

const loadModule = createRequire(import.meta.url);
const load = (name) =>
  loadModule(path.join(process.env.SHOGI_TEST_LIB_DIR, name));
const { emptyHands, initialBoard } = load("board.js");
const {
  chooseLocalAiMove,
  chooseAiMove,
  evaluatePosition,
  expandMovesForSearch,
} = load("ai.js");
const { buildLegalMoves } = load("rules.js");
const { applyMove } = load("moves.js");
const {
  describeMove,
  localEvaluation,
  scoreForSente,
  moveQuality,
  formatEvaluation,
} = load("analysis.js");
const { parseSettings } = load("settings.js");

const emptyBoard = () => Array.from({ length: 9 }, () => Array(9).fill(null));

test("hints and local AI select a legal move for either side, including captures", () => {
  for (const owner of ["b", "w"]) {
    const board = emptyBoard();
    board[8][4] = { type: "K", owner: "b" };
    board[0][4] = { type: "K", owner: "w" };
    board[4][0] = { type: "R", owner };
    board[4][2] = { type: "R", owner: owner === "b" ? "w" : "b" };
    const hands = emptyHands();
    const move = chooseLocalAiMove(board, hands, 1, 500, owner);
    assert.ok(move);
    assert.equal(board[move.from.r][move.from.c].owner, owner);
    assert.deepEqual(move.to, { r: 4, c: 2 });
    assert.ok(
      expandMovesForSearch(
        board,
        hands,
        owner,
        buildLegalMoves(board, hands, owner),
      ).some((legal) => JSON.stringify(legal) === JSON.stringify(move)),
    );
  }
});

test("the local search respects its time budget at deeper levels", () => {
  const start = Date.now();
  assert.ok(chooseLocalAiMove(initialBoard(), emptyHands(), 8, 30, "b"));
  assert.ok(Date.now() - start < 1500);
});

test("local evaluation consistently favors sente after a sente capture", () => {
  const board = initialBoard();
  const hands = emptyHands();
  assert.equal(localEvaluation(board, hands, 0).score, 0);
  board[2][0] = null;
  hands.b.P = 1;
  assert.ok(localEvaluation(board, hands, 1).score > 100);
  assert.equal(scoreForSente(350, "b"), 350);
  assert.equal(scoreForSente(-350, "w"), 350);
});

test("quality compares the same score perspective for either mover", () => {
  const before = { ply: 0, score: 100, source: "engine" };
  const after = { ply: 1, score: 250, source: "engine" };
  assert.equal(moveQuality(before, after, "b"), "good");
  assert.equal(moveQuality(before, after, "w"), "bad");
  assert.equal(
    moveQuality(before, { ...after, source: "local" }, "b"),
    "neutral",
  );
});

test("hint notation explains promotions, already promoted pieces and drops", () => {
  const board = emptyBoard();
  board[3][2] = { type: "P", owner: "b" };
  assert.equal(
    describeMove(
      board,
      { from: { r: 3, c: 2 }, to: { r: 2, c: 2 }, promotion: "must" },
      "b",
    ),
    "▲７三歩成",
  );
  assert.equal(
    describeMove(
      board,
      { from: { r: 3, c: 2 }, to: { r: 2, c: 2 }, promotion: "none" },
      "b",
    ),
    "▲７三歩不成",
  );
  board[3][2].promoted = true;
  assert.equal(
    describeMove(
      board,
      { from: { r: 3, c: 2 }, to: { r: 2, c: 2 }, promotion: "none" },
      "b",
    ),
    "▲７三と",
  );
  assert.equal(
    describeMove(
      board,
      { drop: "S", to: { r: 4, c: 4 }, promotion: "none" },
      "w",
    ),
    "△５五銀打",
  );
  assert.equal(formatEvaluation(-99997), "後手の詰み（3手）");
});

test("old saved settings remain usable and the study modes are independent", () => {
  const old = parseSettings('{"playerOwner":"w","aiDepth":3,"aiTimeMs":800}');
  assert.equal(old.playerOwner, "w");
  assert.equal(old.showHints, false);
  assert.equal(old.showEvaluationGraph, false);
  const hints = parseSettings('{"showHints":true}');
  assert.equal(hints.showHints, true);
  assert.equal(hints.showEvaluationGraph, false);
  assert.equal(parseSettings("null"), null);
  assert.equal(parseSettings("invalid"), null);
});

test("engine evaluation is normalized, and disabled evaluation falls back locally", async () => {
  const previousWindow = global.window;
  const previousFetch = global.fetch;
  const previousMode = process.env.NEXT_PUBLIC_EVAL_MODE;
  global.window = {};
  delete process.env.NEXT_PUBLIC_EVAL_MODE;
  try {
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ score: -420 }),
    });
    assert.deepEqual(
      await evaluatePosition(initialBoard(), emptyHands(), "w", 2, 400),
      { score: 420, source: "engine" },
    );
    global.fetch = async () => ({
      ok: true,
      json: async () => ({ score: null, disabled: true }),
    });
    const local = await evaluatePosition(
      initialBoard(),
      emptyHands(),
      "b",
      2,
      400,
    );
    assert.equal(local.source, "local");
    assert.equal(local.score, 0);
  } finally {
    global.fetch = previousFetch;
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
    if (previousMode === undefined) delete process.env.NEXT_PUBLIC_EVAL_MODE;
    else process.env.NEXT_PUBLIC_EVAL_MODE = previousMode;
  }
});

test("cancelled searches and evaluations never start a fallback search", async () => {
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    chooseAiMove(initialBoard(), emptyHands(), 2, 400, "b", controller.signal),
    { name: "AbortError" },
  );
  await assert.rejects(
    evaluatePosition(
      initialBoard(),
      emptyHands(),
      "b",
      2,
      400,
      controller.signal,
    ),
    { name: "AbortError" },
  );
});

test("a recorded move preserves the board used to evaluate the previous ply", () => {
  const board = initialBoard();
  const hands = emptyHands();
  const next = applyMove(
    board,
    hands,
    { from: { r: 6, c: 2 }, to: { r: 5, c: 2 }, promotion: "none" },
    "b",
  );
  assert.equal(board[6][2].type, "P");
  assert.equal(board[5][2], null);
  assert.equal(next.board[5][2].type, "P");
});

test("aborting an in-flight engine request never launches a local fallback", async () => {
  const previousWindow = global.window;
  const previousFetch = global.fetch;
  global.window = {};
  global.fetch = async (_url, { signal }) =>
    new Promise((_resolve, reject) => {
      signal.addEventListener("abort", () => reject(signal.reason), {
        once: true,
      });
    });
  try {
    const controller = new AbortController();
    const job = chooseAiMove(
      initialBoard(),
      emptyHands(),
      5,
      2000,
      "b",
      controller.signal,
    );
    controller.abort();
    await assert.rejects(job, { name: "AbortError" });
  } finally {
    global.fetch = previousFetch;
    if (previousWindow === undefined) delete global.window;
    else global.window = previousWindow;
  }
});
