import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
const loadModule = createRequire(import.meta.url);
const load = (name) =>
  loadModule(path.join(process.env.SHOGI_TEST_LIB_DIR, name));
const { initialBoard, emptyHands } = load("board.js");
const {
  buildLegalMoves,
  getLegalDropMoves,
  getLegalMovesForPiece,
  resolveLegalMove,
  isSquareAttacked,
} = load("rules.js");
const { applyMove, getMovesForPiece } = load("moves.js");
const { createGameState, gameReducer, repetitionOutcome } = load("game.js");
const { formatKifuEntry } = load("notation.js");
const { positionKey } = load("position.js");
const { minimax } = load("search.js");
const emptyBoard = () => Array.from({ length: 9 }, () => Array(9).fill(null));
const position = () => {
  const board = emptyBoard();
  board[8][4] = { type: "K", owner: "b" };
  board[0][4] = { type: "K", owner: "w" };
  return board;
};
const customState = (board, hands = emptyHands()) => ({
  ...createGameState("b"),
  board,
  hands,
  positionKeys: [positionKey(board, hands, "b")],
});
const clickMove = (state, from, to) =>
  gameReducer(gameReducer(state, { type: "square", ...from }), {
    type: "square",
    ...to,
  });

test("initial shogi move counts remain 30 and 900 at depths 1 and 2", () => {
  const board = initialBoard();
  const hands = emptyHands();
  const moves = buildLegalMoves(board, hands, "b");
  assert.equal(moves.length, 30);
  const count = moves.reduce((total, move) => {
    const next = applyMove(board, hands, move, "b");
    return total + buildLegalMoves(next.board, next.hands, "w").length;
  }, 0);
  assert.equal(count, 900);
});

test("direct attack detection agrees with pseudo-moves on generated positions", () => {
  let seed = 7;
  const random = (max) => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed % max;
  };
  for (let sample = 0; sample < 12; sample++) {
    const board = emptyBoard();
    for (let i = 0; i < 25; i++) {
      const type = ["P", "L", "N", "S", "G", "B", "R", "K"][random(8)];
      board[random(9)][random(9)] = {
        type,
        owner: random(2) ? "b" : "w",
        promoted: !["K", "G"].includes(type) && random(2) === 0,
      };
    }
    for (const attacker of ["b", "w"]) {
      for (let r = 0; r < 9; r++)
        for (let c = 0; c < 9; c++) {
          if (board[r][c]?.owner === attacker) continue;
          const expected = board.some((row, fr) =>
            row.some(
              (piece, fc) =>
                piece?.owner === attacker &&
                getMovesForPiece(board, fr, fc).some(
                  (move) => move.to.r === r && move.to.c === c,
                ),
            ),
          );
          assert.equal(
            isSquareAttacked(board, { r, c }, attacker),
            expected,
            JSON.stringify({ sample, attacker, r, c }),
          );
        }
    }
  }
});

test("pawn-drop mate is rejected while an escapable pawn check is legal", () => {
  const board = position();
  const hands = emptyHands();
  hands.b.P = 1;
  board[0][3] = { type: "L", owner: "w" };
  board[0][5] = { type: "L", owner: "w" };
  board[2][4] = { type: "G", owner: "b" };
  const matingDrop = (moves) =>
    moves.some(
      (move) => move.drop === "P" && move.to.r === 1 && move.to.c === 4,
    );
  assert.equal(matingDrop(getLegalDropMoves(board, hands, "b")), false);
  board[0][3] = null;
  assert.equal(matingDrop(getLegalDropMoves(board, hands, "b")), true);
});

test("advancing a pawn to mate remains legal", () => {
  const board = position();
  const hands = emptyHands();
  board[0][3] = { type: "L", owner: "w" };
  board[0][5] = { type: "L", owner: "w" };
  board[2][3] = { type: "G", owner: "b" };
  board[2][5] = { type: "G", owner: "b" };
  board[2][4] = { type: "P", owner: "b" };
  assert.ok(
    resolveLegalMove(board, hands, "b", {
      from: { r: 2, c: 4 },
      to: { r: 1, c: 4 },
      promotion: "none",
    }),
  );
});

test("external moves cannot move an opponent piece, jump, capture a king, or invent a promotion", () => {
  const board = initialBoard();
  const hands = emptyHands();
  assert.deepEqual(getLegalMovesForPiece(board, hands, "b", 2, 0), []);
  for (const move of [
    { from: { r: 2, c: 0 }, to: { r: 3, c: 0 }, promotion: "none" },
    { from: { r: 6, c: 0 }, to: { r: 4, c: 0 }, promotion: "none" },
    { from: { r: 6, c: 0 }, to: { r: 5, c: 0 }, promotion: "must" },
    { drop: "P", to: { r: 4, c: 0 }, promotion: "none" },
    { from: { r: -1, c: 0 }, to: { r: 0, c: 0 }, promotion: "none" },
  ])
    assert.equal(resolveLegalMove(board, hands, "b", move), null);
  const kings = position();
  kings[1][4] = { type: "R", owner: "b" };
  assert.equal(
    resolveLegalMove(kings, hands, "b", {
      from: { r: 1, c: 4 },
      to: { r: 0, c: 4 },
      promotion: "none",
    }),
    null,
  );
});

test("promotion is atomic and kifu uses the piece name before promotion", () => {
  const board = position();
  board[3][2] = { type: "P", owner: "b" };
  const pending = clickMove(customState(board), { r: 3, c: 2 }, { r: 2, c: 2 });
  assert.ok(pending.pendingPromotion);
  assert.equal(pending.history.length, 0);
  const promoted = gameReducer(pending, { type: "promote", promote: true });
  assert.equal(formatKifuEntry(promoted.history[0], 0), "1. ▲７三歩成");
  assert.equal(promoted.board[2][2].promoted, true);
  const declined = gameReducer(pending, { type: "promote", promote: false });
  assert.equal(formatKifuEntry(declined.history[0], 0), "1. ▲７三歩不成");
  assert.equal(board[3][2].promoted, undefined);
  assert.equal(promoted.board[8], board[8]);
  assert.equal(promoted.board[8][4], board[8][4]);
});

test("checkmate terminates a game without allowing a king capture", () => {
  const board = position();
  const hands = emptyHands();
  hands.b.G = 1;
  board[0][3] = { type: "L", owner: "w" };
  board[0][5] = { type: "L", owner: "w" };
  board[2][4] = { type: "G", owner: "b" };
  let state = gameReducer(customState(board, hands), {
    type: "drop",
    piece: "G",
  });
  state = gameReducer(state, { type: "square", r: 1, c: 4 });
  assert.deepEqual(state.outcome, { winner: "b", reason: "checkmate" });
  assert.equal(state.evaluations.at(-1).score, 100000);
  assert.equal(state.board[0][4].type, "K");
});

test("late AI moves and evaluation responses are rejected after reset", () => {
  const old = createGameState("w");
  const reset = gameReducer(old, { type: "reset" });
  const move = { from: { r: 6, c: 2 }, to: { r: 5, c: 2 }, promotion: "none" };
  assert.equal(
    gameReducer(reset, { type: "play", session: old.session, ply: 0, move }),
    reset,
  );
  assert.equal(
    gameReducer(reset, {
      type: "evaluation",
      session: old.session,
      ply: 0,
      evaluation: { score: 900, source: "engine" },
    }),
    reset,
  );
  const played = gameReducer(old, { type: "play", session: 0, ply: 0, move });
  assert.equal(played.history.length, 1);
  assert.equal(
    gameReducer(played, { type: "play", session: 0, ply: 0, move }),
    played,
  );
});

test("fourfold repetition includes hands, promotion and side to move", () => {
  let state = customState(position());
  for (let cycle = 0; cycle < 3; cycle++) {
    state = clickMove(state, { r: 8, c: 4 }, { r: 8, c: 3 });
    state = gameReducer(state, {
      type: "play",
      session: 0,
      ply: state.history.length,
      move: { from: { r: 0, c: 4 }, to: { r: 0, c: 3 }, promotion: "none" },
    });
    state = clickMove(state, { r: 8, c: 3 }, { r: 8, c: 4 });
    state = gameReducer(state, {
      type: "play",
      session: 0,
      ply: state.history.length,
      move: { from: { r: 0, c: 3 }, to: { r: 0, c: 4 }, promotion: "none" },
    });
  }
  assert.deepEqual(state.outcome, { winner: null, reason: "repetition" });
  const board = initialBoard();
  const hands = emptyHands();
  const key = positionKey(board, hands, "b");
  assert.notEqual(positionKey(board, hands, "w"), key);
  hands.b.P = 1;
  assert.notEqual(positionKey(board, hands, "b"), key);
  hands.b.P = 0;
  board[6][0].promoted = true;
  assert.notEqual(positionKey(board, hands, "b"), key);
});

test("continuous checking through fourfold repetition loses for the checking side", () => {
  const history = Array.from({ length: 6 }, (_, i) => ({
    owner: i % 2 === 0 ? "b" : "w",
    givesCheck: i % 2 === 0,
  }));
  assert.deepEqual(
    repetitionOutcome(["A", "B", "A", "B", "A", "B", "A"], history),
    { winner: "w", reason: "perpetual-check" },
  );
});

test("search detects checkmate even at the depth-zero horizon for either side", () => {
  const board = position();
  board[0][3] = { type: "L", owner: "w" };
  board[0][5] = { type: "L", owner: "w" };
  board[1][4] = { type: "G", owner: "b" };
  board[2][4] = { type: "G", owner: "b" };
  assert.equal(
    minimax(board, emptyHands(), 0, -Infinity, Infinity, true),
    -10000,
  );
  const mirrored = [...board].reverse().map((row) =>
    [...row].reverse().map(
      (piece) =>
        piece && {
          ...piece,
          owner: piece.owner === "b" ? "w" : "b",
        },
    ),
  );
  assert.equal(
    minimax(mirrored, emptyHands(), 0, -Infinity, Infinity, false),
    10000,
  );
});
