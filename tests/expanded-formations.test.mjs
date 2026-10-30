import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const load = (name) => require(path.join(process.env.SHOGI_TEST_LIB_DIR, name));
const { initialBoard, emptyHands } = load("board.js");
const { resolveLegalMove } = load("rules.js");
const { applyMove } = load("moves.js");
const { createGameState, gameReducer } = load("game.js");
const {
  formations,
  detectFormations,
  formationSquare: sq,
  parseFormationCatalog,
} = load("formations.js");
const fixtures = JSON.parse(
  fs.readFileSync(
    new URL("./expanded-formation-fixtures.json", import.meta.url),
    "utf8",
  ),
);
const byId = new Map(formations.map((f) => [f.id, f]));
const invert = (side) => (side === "b" ? "w" : "b");
const coordinate = (s, flipped) => {
  let file = Number(s[0]);
  let rank = s.charCodeAt(1) - 96;
  if (flipped) {
    file = 10 - file;
    rank = 10 - rank;
  }
  return sq(file, rank, "b");
};

// Replay published or independently authored legal moves, never boards assembled
// from the detector's own pattern data. Both sides' moves and captures are retained.
function firstRecognition(fixture, flipped = false) {
  let board = initialBoard();
  let hands = emptyHands();
  const history = [];
  const side = flipped ? invert(fixture.side) : fixture.side;
  for (const [originalOwner, usi] of fixture.moves) {
    const owner = flipped ? invert(originalOwner) : originalOwner;
    const to = coordinate(usi.slice(2, 4), flipped);
    const isDrop = usi[1] === "*";
    const candidate = {
      ...(isDrop
        ? { drop: usi[0] }
        : { from: coordinate(usi.slice(0, 2), flipped) }),
      to,
      promotion: usi.endsWith("+") ? "must" : "none",
    };
    const move = resolveLegalMove(board, hands, owner, candidate);
    assert.ok(
      move,
      `${byId.get(fixture.id).name}: illegal ${owner} ${usi}, ply ${history.length + 1}`,
    );
    const piece = move.from && board[move.from.r][move.from.c];
    history.push({
      ...move,
      owner,
      pieceType: piece?.type ?? move.drop,
      captured: board[to.r][to.c]?.type,
      promoted: !!piece?.promoted,
      isDrop,
      givesCheck: false,
      optionalPromotion: false,
    });
    ({ board, hands } = applyMove(board, hands, move, owner));
    const event = detectFormations(board, history, side, []).find(
      (e) => e.id === fixture.id,
    );
    if (event) return { board, hands, history, side, event };
  }
  return null;
}

for (const fixture of fixtures) {
  const formation = byId.get(fixture.id);
  for (const flipped of formation.recognition.owner ? [false] : [false, true]) {
    test(`${formation.name} recognizes an independent legal setup (${flipped ? "rotated" : "original"})`, () => {
      const found = firstRecognition(fixture, flipped);
      assert.ok(found, `not recognized: ${formation.name}, ${fixture.source}`);
      const { board, history, side, event } = found;
      assert.equal(
        detectFormations(board, history, side, [event]).some(
          (e) => e.id === formation.id,
        ),
        false,
      );
      assert.equal(
        detectFormations(board, [], side, []).some(
          (e) => e.id === formation.id,
        ),
        false,
      );
      for (const square of event.squares) {
        const original = board[square.r][square.c];
        for (const replacement of [
          null,
          { ...original, promoted: true },
          { ...original, owner: invert(side) },
        ]) {
          board[square.r][square.c] = replacement;
          assert.equal(
            detectFormations(board, history, side, []).some(
              (e) => e.id === formation.id,
            ),
            false,
            `missing/changed guard ${formation.name}`,
          );
        }
        board[square.r][square.c] = original;
      }
      if (formation.kind === "opening") {
        const late = [
          ...history,
          ...Array.from({ length: 101 }, () => ({
            owner: side,
            pieceType: "K",
            to: sq(5, 9, side),
          })),
        ];
        assert.equal(
          detectFormations(board, late, side, []).some(
            (e) => e.id === formation.id,
          ),
          false,
        );
      }
    });
  }
}

test("new condition types reject typos, cycles, inactive dependencies and invalid coordinates", () => {
  const original = load("data/formations.json");
  const active = original.formations.find(
    (f) => f.recognition?.patterns[0].requires,
  );
  for (const mutate of [
    (e) => {
      e.recognition.owner = "z";
    },
    (e) => {
      e.recognition.minOwnMoves = 101;
    },
    (e) => {
      e.recognition.minOwnMoves = 31;
      e.recognition.maxOwnMoves = 30;
    },
    (e) => {
      e.recognition.patterns[0].requires = [e.id];
    },
    (e) => {
      e.recognition.patterns[0].requires = [
        original.formations.find((f) => f.recognition === null).id,
      ];
    },
    (e) => {
      e.recognition.patterns[0].emptySquares = [[10, 8]];
    },
    (e) => {
      const [, f, r] = e.recognition.patterns[0].pieces[0];
      e.recognition.patterns[0].emptySquares = [[f, r]];
    },
    (e) => {
      e.recognition.patterns[0].history = { orderedMoves: [] };
    },
    (e) => {
      e.recognition.patterns[0].history = {
        opponentMoves: [["S", 7, 9, 10, 8]],
      };
    },
    (e) => {
      e.recognition.patterns[0].history = { drops: [["K", 0, 0]] };
    },
    (e) => {
      e.recognition.patterns[0].history = { rookFiles: [2, 2] };
    },
    (e) => {
      e.recognition.patterns[0].history = { opponentRookFiles: [0] };
    },
    (e) => {
      e.recognition.patterns[0].history = { rangingRooks: "maybe" };
    },
    (e) => {
      e.recognition.patterns[0].history = {
        opponentFirstMove: ["P", 7, 7, 7, 10],
      };
    },
  ]) {
    const copy = structuredClone(original);
    mutate(copy.formations.find((f) => f.id === active.id));
    assert.throws(
      () => parseFormationCatalog(copy),
      /Invalid formation catalog/,
    );
  }
});

test("floating rooks and Subway Rook do not establish a double-ranging-rook opening", () => {
  const formation = formations.find((f) => f.name === "相振り飛車");
  const moves = [
    ["b", "2g2f"],
    ["w", "8c8d"],
    ["b", "2f2e"],
    ["w", "8d8e"],
    ["b", "6i7h"],
    ["w", "4a3b"],
    ["b", "2e2d"],
    ["w", "2c2d"],
    ["b", "2h2d"],
    ["w", "8e8f"],
    ["b", "8g8f"],
    ["w", "8b8f"],
    ["b", "2d2f"],
    ["w", "8f8d"],
    ["b", "2f7f"],
    ["w", "8d4d"],
  ];
  for (const side of ["b", "w"])
    assert.equal(
      firstRecognition({
        id: formation.id,
        side,
        source: "independent floating-rook setup",
        moves,
      }),
      null,
    );
  const subway = fixtures.find((f) => byId.get(f.id).name === "地下鉄飛車");
  assert.equal(firstRecognition({ ...subway, id: formation.id }), null);
});

test("named counterattacks require the opponent's specific formation", () => {
  for (const name of [
    "超速▲3七銀",
    "ポンポン桂",
    "鷺宮定跡",
    "４六銀左急戦",
    "4五歩早仕掛け",
  ]) {
    const formation = formations.find((f) => f.name === name);
    const found = firstRecognition(fixtures.find((f) => f.id === formation.id));
    assert.ok(found, name);
    const { board, history, side } = found;
    for (const [, file, rank] of formation.recognition.patterns[0]
      .opponentPieces) {
      const square = sq(file, rank, side);
      const original = board[square.r][square.c];
      board[square.r][square.c] = null;
      assert.equal(
        detectFormations(board, history, side, []).some(
          (e) => e.id === formation.id,
        ),
        false,
        name,
      );
      board[square.r][square.c] = original;
    }
  }
});

test("Packman requires the opponent's first move, not a later bishop-pawn advance", () => {
  const formation = formations.find((f) => f.name === "4四歩パックマン");
  const { board, history, side } = firstRecognition(
    fixtures.find((f) => f.id === formation.id),
  );
  const earlierPawnMove = {
    owner: "b",
    pieceType: "P",
    from: sq(2, 7, "b"),
    to: sq(2, 6, "b"),
    isDrop: false,
  };
  assert.equal(
    detectFormations(board, [earlierPawnMove, ...history], side, []).some(
      (e) => e.id === formation.id,
    ),
    false,
  );
});

test("named move-order openings reject reordered or missing landmarks, and drops cannot imitate moves", () => {
  for (const name of [
    "４→３戦法",
    "矢倉早囲い",
    "山田定跡",
    "森下システム",
    "都成流",
  ]) {
    const formation = formations.find((f) => f.name === name);
    const fixture = fixtures.find((f) => f.id === formation.id);
    const found = firstRecognition(fixture);
    assert.ok(found, name);
    const { board, history, side } = found;
    const bad = history.map((entry) =>
      entry.owner === side
        ? { ...entry, isDrop: true, from: undefined }
        : entry,
    );
    assert.equal(
      detectFormations(board, bad, side, []).some((e) => e.id === formation.id),
      false,
      name,
    );
  }
});

test("dependencies require today's shape, opponent history, and the original surviving rooks", () => {
  for (const name of ["エルモ急戦", "脇システム", "相矢倉", "相振り飛車"]) {
    const formation = formations.find((f) => f.name === name);
    const found = firstRecognition(fixtures.find((f) => f.id === formation.id));
    assert.ok(found, name);
    const { board, history, side } = found;
    for (let r = 0; r < 9; r++)
      for (let c = 0; c < 9; c++)
        if (board[r][c]?.owner === invert(side)) board[r][c] = null;
    assert.equal(
      detectFormations(board, history, side, []).some(
        (e) => e.id === formation.id,
      ),
      false,
      name,
    );
  }
});

test("named opening sides cannot be unlocked by rotating the same setup", () => {
  for (const fixture of fixtures) {
    const formation = byId.get(fixture.id);
    if (!formation.recognition.owner) continue;
    assert.equal(firstRecognition(fixture, true), null, formation.name);
  }
});

test("Yamada rejects reversing the pawn thrust and silver advance with both moves still present", () => {
  const formation = formations.find((f) => f.name === "山田定跡");
  const found = firstRecognition(fixtures.find((f) => f.id === formation.id));
  assert.ok(found);
  const { board, history, side } = found;
  const matches = (entry, type, from, to) =>
    entry.owner === side &&
    entry.pieceType === type &&
    entry.from?.r === sq(...from, side).r &&
    entry.from?.c === sq(...from, side).c &&
    entry.to.r === sq(...to, side).r &&
    entry.to.c === sq(...to, side).c;
  const pawnIndex = history.findIndex((entry) =>
    matches(entry, "P", [3, 6], [3, 5]),
  );
  const silverIndex = history.findIndex((entry) =>
    matches(entry, "S", [5, 7], [4, 6]),
  );
  assert.ok(pawnIndex >= 0 && silverIndex > pawnIndex);
  const reversed = [...history];
  [reversed[pawnIndex], reversed[silverIndex]] = [
    reversed[silverIndex],
    reversed[pawnIndex],
  ];
  assert.equal(
    detectFormations(board, reversed, side, []).some(
      (e) => e.id === formation.id,
    ),
    false,
  );
});

test("an earlier parent discovery never substitutes for the current parent guards", () => {
  const formation = formations.find((f) => f.name === "矢倉加藤流");
  const parentId = formations.find((f) => f.name === "矢倉戦法").id;
  const found = firstRecognition(fixtures.find((f) => f.id === formation.id));
  assert.ok(found);
  const { board, history, side } = found;
  const guard = sq(7, 8, side);
  board[guard.r][guard.c] = null;
  assert.equal(
    detectFormations(board, history, side, [
      { id: parentId, owner: side, ply: 1 },
    ]).some((e) => e.id === formation.id),
    false,
  );
});

test("both players discover Aifuribisha when the opponent completes the second rook shift", () => {
  const id = formations.find((f) => f.name === "相振り飛車").id;
  for (const player of ["b", "w"]) {
    let state = createGameState(player);
    for (const [side, ff, fr, tf, tr] of [
      ["b", 6, 7, 6, 6],
      ["w", 6, 7, 6, 6],
      ["b", 2, 8, 6, 8],
      ["w", 2, 8, 6, 8],
    ]) {
      assert.equal(state.turn, side);
      const from = sq(ff, fr, side);
      const to = sq(tf, tr, side);
      if (side === player) {
        state = gameReducer(state, { type: "square", ...from });
        state = gameReducer(state, { type: "square", ...to });
      } else {
        state = gameReducer(state, {
          type: "play",
          session: state.session,
          ply: state.history.length,
          move: { from, to, promotion: "none" },
        });
      }
      if (state.history.length < 4)
        assert.equal(
          state.formations.some((e) => e.id === id),
          false,
        );
    }
    const discovered = state.formations.filter((e) => e.id === id);
    assert.deepEqual(
      new Set(discovered.map((e) => e.owner)),
      new Set(["b", "w"]),
    );
    assert.ok(discovered.every((e) => e.ply === 4));
  }
});
