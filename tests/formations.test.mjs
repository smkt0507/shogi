import { test } from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { createRequire } from "node:module";
import { additionalSequences } from "./additional-formation-fixtures.mjs";

const require = createRequire(import.meta.url);
const load = (name) => require(path.join(process.env.SHOGI_TEST_LIB_DIR, name));
const {
  formations,
  detectableFormations,
  detectFormations,
  formationSquare: sq,
  parseCollection,
  parseFormationRecords,
} = load("formations.js");
const { initialBoard, emptyHands } = load("board.js");
const { applyMove } = load("moves.js");
const { resolveLegalMove, buildLegalMoves } = load("rules.js");
const { createGameState, gameReducer } = load("game.js");
const { parseSettings, parseResult } = load("settings.js");

const sequences = {
  shikenbisha: [
    [6, 7, 6, 6],
    [2, 8, 6, 8],
  ],
  sankenbisha: [
    [7, 7, 7, 6],
    [2, 8, 7, 8],
  ],
  nakabisha: [
    [5, 7, 5, 6],
    [2, 8, 5, 8],
  ],
  migishikenbisha: [
    [5, 7, 5, 6],
    [5, 6, 5, 5],
    [4, 7, 4, 6],
    [3, 9, 4, 8],
    [4, 8, 5, 7],
    [5, 7, 5, 6],
    [2, 8, 4, 8],
  ],
  bogin: [
    [2, 7, 2, 6],
    [2, 6, 2, 5],
    [3, 9, 3, 8],
    [3, 8, 2, 7],
    [2, 7, 2, 6],
  ],
  mino: [
    [6, 7, 6, 6],
    [2, 8, 6, 8],
    [5, 9, 4, 8],
    [4, 8, 3, 8],
    [3, 8, 2, 8],
    [3, 9, 3, 8],
    [6, 9, 5, 8],
  ],
  yagura: [
    [7, 7, 7, 6],
    [7, 9, 6, 8],
    [6, 9, 7, 8],
    [6, 7, 6, 6],
    [6, 8, 7, 7],
    [4, 9, 5, 8],
    [5, 8, 6, 7],
    [8, 8, 7, 9],
    [7, 9, 6, 8],
    [5, 9, 6, 9],
    [6, 9, 7, 9],
    [7, 9, 8, 8],
  ],
  anaguma: [
    [6, 7, 6, 6],
    [2, 8, 6, 8],
    [5, 9, 4, 8],
    [4, 8, 3, 8],
    [3, 8, 2, 8],
    [1, 7, 1, 6],
    [1, 9, 1, 8],
    [2, 8, 1, 9],
    [3, 9, 2, 8],
    [4, 9, 3, 9],
    [6, 9, 5, 8],
    [5, 8, 4, 8],
    [4, 8, 3, 8],
  ],
};

Object.assign(sequences, {
  kata_mino: sequences.mino.slice(0, -1),
  taka_mino: [...sequences.mino, [4, 7, 4, 6], [5, 8, 4, 7]],
  ginkan: [
    ...sequences.mino,
    [4, 7, 4, 6],
    [5, 8, 4, 7],
    [2, 7, 2, 6],
    [3, 8, 2, 7],
    [4, 9, 3, 8],
  ],
  diamond_mino: [
    ...sequences.mino,
    [4, 7, 4, 6],
    [7, 9, 7, 8],
    [7, 8, 6, 7],
    [6, 7, 5, 6],
    [5, 6, 4, 7],
  ],
  gin_yagura: [
    [7, 7, 7, 6],
    [7, 9, 6, 8],
    [6, 9, 7, 8],
    [6, 7, 6, 6],
    [6, 8, 7, 7],
    [5, 7, 5, 6],
    [3, 9, 4, 8],
    [4, 8, 5, 7],
    [5, 7, 6, 8],
    [6, 8, 6, 7],
    [8, 8, 7, 9],
    [7, 9, 6, 8],
    [5, 9, 6, 9],
    [6, 9, 7, 9],
    [7, 9, 8, 8],
  ],
  kata_yagura: [
    [7, 7, 7, 6],
    [7, 9, 6, 8],
    [6, 7, 6, 6],
    [6, 8, 7, 7],
    [4, 9, 5, 8],
    [5, 8, 6, 7],
    [6, 9, 6, 8],
    [5, 9, 6, 9],
    [6, 9, 7, 8],
  ],
  sou_yagura: [...sequences.yagura, [5, 7, 5, 6], [3, 9, 4, 8], [4, 8, 5, 7]],
  funa: [
    [4, 9, 5, 8],
    [5, 9, 6, 8],
    [6, 8, 7, 8],
  ],
  kani: [
    [7, 9, 6, 8],
    [6, 9, 7, 8],
    [4, 9, 5, 8],
    [5, 9, 6, 9],
  ],
  kinmusou: [
    [6, 7, 6, 6],
    [2, 8, 6, 8],
    [3, 9, 2, 8],
    [5, 9, 4, 8],
    [4, 8, 3, 8],
    [4, 9, 4, 8],
    [6, 9, 5, 8],
  ],
  gangi: [
    [6, 7, 6, 6],
    [5, 7, 5, 6],
    [7, 9, 6, 8],
    [6, 8, 6, 7],
    [3, 9, 4, 8],
    [4, 8, 5, 7],
    [6, 9, 7, 8],
    [4, 9, 5, 8],
    [5, 9, 6, 9],
  ],
  elmo: [
    [7, 9, 6, 8],
    [6, 9, 7, 8],
    [7, 8, 7, 9],
    [5, 9, 6, 9],
    [6, 9, 7, 8],
    [4, 9, 5, 9],
  ],
  nakazumai: [
    [6, 9, 7, 8],
    [4, 9, 3, 8],
    [5, 9, 5, 8],
  ],
  mukaibisha: [
    [7, 7, 7, 6],
    [8, 8, 7, 7],
    [8, 7, 8, 6],
    [2, 8, 8, 8],
  ],
  sodebisha: [
    [3, 7, 3, 6],
    [2, 8, 3, 8],
  ],
  ishida: [
    [7, 7, 7, 6],
    [7, 6, 7, 5],
    [2, 8, 7, 8],
    [7, 8, 7, 6],
    [8, 9, 7, 7],
    [9, 7, 9, 6],
    [8, 8, 9, 7],
    [6, 7, 6, 6],
    [7, 9, 6, 8],
    [6, 8, 6, 7],
  ],
  hayaishida: [
    [7, 7, 7, 6],
    [7, 6, 7, 5],
    [2, 8, 7, 8],
    [7, 8, 7, 6],
  ],
  gokigen: [
    [7, 7, 7, 6],
    [5, 7, 5, 6],
    [5, 6, 5, 5],
    [2, 8, 5, 8],
  ],
});

Object.assign(sequences, additionalSequences(sequences));

function positionAfter(sequence, owner) {
  let board = initialBoard();
  let hands = emptyHands();
  const history = [];
  for (const [ff, fr, tf, tr] of sequence) {
    const candidate = {
      from: sq(ff, fr, owner),
      to: sq(tf, tr, owner),
      promotion: "none",
    };
    const move = resolveLegalMove(board, hands, owner, candidate);
    assert.ok(move, `legal move ${JSON.stringify(candidate)}`);
    const piece = board[move.from.r][move.from.c];
    history.push({
      ...move,
      owner,
      captured: board[move.to.r][move.to.c]?.type,
      pieceType: piece.type,
      promoted: false,
      isDrop: false,
      givesCheck: false,
      optionalPromotion: false,
    });
    ({ board, hands } = applyMove(board, hands, move, owner));
  }
  return { board, hands, history };
}

for (const owner of ["b", "w"]) {
  for (const [id, sequence] of Object.entries(sequences)) {
    test(`${id} is recognized from legal piece movements for ${owner}`, () => {
      const { board, history } = positionAfter(sequence, owner);
      const events = detectFormations(board, history, owner, []);
      const event = events.find((item) => item.id === id);
      assert.ok(event, `missing ${id}: ${JSON.stringify(events)}`);
      assert.equal(event.ply, sequence.length);
      assert.equal(event.owner, owner);
      assert.ok(
        event.squares.every(({ r, c }) => board[r][c]?.owner === owner),
      );
      assert.equal(detectFormations(board, history, owner, events).length, 0);
    });
  }
}

test("castles require every unpromoted guard and accept left/right mirrored shapes", () => {
  for (const formation of detectableFormations.filter(
    (item) => item.kind === "castle",
  )) {
    for (const owner of ["b", "w"]) {
      for (const mirror of formation.recognition.mirror
        ? [false, true]
        : [false]) {
        const board = Array.from({ length: 9 }, () => Array(9).fill(null));
        for (const [type, file, rank] of formation.example) {
          const { r, c } = sq(mirror ? 10 - file : file, rank, owner);
          board[r][c] = { type, owner };
        }
        assert.ok(
          detectFormations(board, [{}], owner, []).some(
            (e) => e.id === formation.id,
          ),
        );
        for (const [, file, rank] of formation.example) {
          const { r, c } = sq(mirror ? 10 - file : file, rank, owner);
          const piece = board[r][c];
          for (const replacement of [
            null,
            { ...piece, promoted: true },
            { ...piece, owner: owner === "b" ? "w" : "b" },
          ]) {
            board[r][c] = replacement;
            assert.equal(
              detectFormations(board, [{}], owner, []).some(
                (e) => e.id === formation.id,
              ),
              false,
            );
          }
          board[r][c] = piece;
        }
      }
    }
  }
});

test("opening recognition rejects incomplete shapes, missing history and late positions", () => {
  for (const formation of detectableFormations.filter(
    (item) => item.kind === "opening" && sequences[item.id],
  )) {
    const { board, history } = positionAfter(sequences[formation.id], "b");
    assert.equal(detectFormations(board, [], "b", []).length, 0);
    const late = [
      ...history,
      ...Array.from({ length: 31 }, () => ({
        owner: "b",
        pieceType: "K",
        to: sq(5, 9, "b"),
      })),
    ];
    assert.equal(
      detectFormations(board, late, "b", []).some((e) => e.id === formation.id),
      false,
    );
    for (const square of detectFormations(board, history, "b", []).find(
      (e) => e.id === formation.id,
    ).squares) {
      const piece = board[square.r][square.c];
      board[square.r][square.c] = null;
      assert.equal(
        detectFormations(board, history, "b", []).some(
          (e) => e.id === formation.id,
        ),
        false,
      );
      board[square.r][square.c] = piece;
    }
  }
  assert.deepEqual(detectFormations(initialBoard(), [], "b", []), []);
});

test("captured and dropped rooks or right silvers cannot earn an opening", () => {
  for (const [id, type, origin] of [
    ["shikenbisha", "R", [2, 8]],
    ["bogin", "S", [3, 9]],
  ]) {
    const { board, history } = positionAfter(sequences[id], "b");
    const captured = {
      owner: "w",
      pieceType: "R",
      to: sq(...origin, "b"),
      isDrop: false,
    };
    const substitute = history.map((entry) =>
      entry.pieceType === type
        ? { ...entry, from: undefined, isDrop: true }
        : entry,
    );
    assert.equal(
      detectFormations(board, [captured, ...substitute], "b", []).some(
        (e) => e.id === id,
      ),
      false,
    );
  }
});

function ownMove(state, coordinates) {
  if (state.turn !== state.playerOwner) {
    // Let the opponent make a harmless pawn move on its own side of the board.
    const move = buildLegalMoves(state.board, state.hands, state.turn).find(
      (move) => {
        if (!move.from) return false;
        return (
          state.board[move.from.r][move.from.c]?.type === "P" &&
          (state.turn === "b" ? move.to.r >= 4 : move.to.r <= 4)
        );
      },
    );
    assert.ok(move);
    state = gameReducer(state, {
      type: "play",
      move,
      session: state.session,
      ply: state.history.length,
    });
  }
  const [ff, fr, tf, tr] = coordinates;
  const owner = state.playerOwner;
  const before = state.history.length;
  state = gameReducer(state, { type: "square", ...sq(ff, fr, owner) });
  state = gameReducer(state, { type: "square", ...sq(tf, tr, owner) });
  assert.equal(state.history.length, before + 1);
  return state;
}

test("the reducer records once per side, keeps move origins, and clears events on reset", () => {
  for (const owner of ["b", "w"]) {
    let state = createGameState(owner);
    for (const move of sequences.mino) state = ownMove(state, move);
    assert.ok(
      state.formations.some((e) => e.id === "mino" && e.owner === owner),
    );
    assert.ok(state.history.every((entry) => entry.from));
    const recorded = state.formations.length;
    state = ownMove(state, [4, 9, 4, 8]);
    state = ownMove(state, [4, 8, 4, 9]);
    assert.equal(state.formations.length, recorded);
    const unchanged = gameReducer(state, {
      type: "evaluation",
      session: state.session,
      ply: 0,
      evaluation: { source: "engine", score: 100 },
    });
    assert.equal(unchanged.formations, state.formations);
    const reset = gameReducer(state, { type: "reset" });
    assert.deepEqual(reset.formations, []);
    assert.equal(reset.session, state.session + 1);
  }
});

test("the AI and player can independently discover the same opening", () => {
  let state = createGameState("b");
  for (const move of sequences.shikenbisha) {
    state = ownMove(state, move);
    const [ff, fr, tf, tr] = move;
    state = gameReducer(state, {
      type: "play",
      session: state.session,
      ply: state.history.length,
      move: { from: sq(ff, fr, "w"), to: sq(tf, tr, "w"), promotion: "none" },
    });
  }
  assert.deepEqual(
    state.formations
      .filter((event) => event.id === "shikenbisha")
      .map((event) => event.owner),
    ["b", "w"],
  );
});

test("collection and result parsing sanitize records and preserve old saves", () => {
  assert.deepEqual(parseCollection('["mino","bogin","unknown","mino",null]'), [
    "mino",
    "bogin",
  ]);
  assert.deepEqual(parseCollection("invalid"), []);
  assert.deepEqual(parseCollection("{}"), []);
  const records = [{ id: "mino", owner: "b", ply: 12 }];
  assert.deepEqual(
    parseFormationRecords([
      ...records,
      ...records,
      { id: "mino", owner: "w", ply: 13 },
      { id: "bogin", owner: "b", ply: -1 },
      { id: "unknown", owner: "b", ply: 2 },
      { id: "yagura", owner: "z", ply: 3 },
      { id: "yagura", owner: "b", ply: 1.5 },
    ]),
    [...records, { id: "mino", owner: "w", ply: 13 }],
  );
  const result = { winner: "b", playerOwner: "b", formations: records };
  assert.deepEqual(parseResult(JSON.stringify(result)).formations, records);
  assert.deepEqual(
    parseResult('{"winner":"b","playerOwner":"b"}').formations,
    [],
  );
  const settings = parseSettings("{}");
  assert.equal(settings.showFormationEffects, true);
  assert.equal(settings.formationSound, false);
  assert.equal(
    parseSettings('{"showFormationEffects":false,"formationSound":true}')
      .showFormationEffects,
    false,
  );
});

const bishopExchange = [
  ["b", 7, 7, 7, 6],
  ["w", 2, 7, 2, 6],
  ["b", 2, 7, 2, 6],
  ["w", 2, 6, 2, 5],
  ["b", 8, 8, 7, 7],
  ["w", 7, 7, 7, 6],
  ["b", 7, 9, 8, 8],
  ["w", 8, 8, 3, 3, "must"],
  ["b", 8, 8, 7, 7],
];
const pawnExchanges = [
  ["b", 2, 7, 2, 6],
  ["w", 2, 7, 2, 6],
  ["b", 2, 6, 2, 5],
  ["w", 2, 6, 2, 5],
  ["b", 6, 9, 7, 8],
  ["w", 6, 9, 7, 8],
  ["b", 2, 5, 2, 4],
  ["w", 8, 7, 8, 6],
  ["b", 2, 8, 2, 4],
  ["w", 2, 5, 2, 4],
  ["b", 8, 7, 8, 6],
  ["w", 2, 8, 2, 4],
];
const contextualSequences = {
  kakugawari: bishopExchange,
  koshikakegin: [
    ...bishopExchange,
    ...[
      [4, 7, 4, 6],
      [3, 9, 4, 8],
      [4, 8, 4, 7],
      [4, 7, 5, 6],
    ].map((move) => ["b", ...move]),
  ],
  hayakurigin: [
    ...bishopExchange,
    ...[
      [3, 7, 3, 6],
      [3, 9, 3, 8],
      [3, 8, 3, 7],
      [3, 7, 4, 6],
    ].map((move) => ["b", ...move]),
  ],
  kakukoukan_shiken: [
    ["b", 7, 7, 7, 6],
    ["w", 7, 7, 7, 6],
    ["b", 8, 8, 2, 2, "must"],
    ["w", 7, 9, 8, 8],
    ["b", 2, 8, 6, 8],
  ],
  aigakari: pawnExchanges,
  hineribisha: [
    ...pawnExchanges.slice(0, 9),
    ["b", 2, 4, 2, 6],
    ["b", 7, 7, 7, 6],
    ["b", 7, 6, 7, 5],
    ["b", 2, 6, 7, 6],
    ["b", 8, 9, 7, 7],
  ],
  kakukoukan_sanken: [
    ["b", 7, 7, 7, 6],
    ["w", 7, 7, 7, 6],
    ["b", 8, 8, 2, 2, "must"],
    ["w", 7, 9, 8, 8],
    ["b", 2, 8, 7, 8],
  ],
  yokofudori: [
    ["b", 7, 7, 7, 6],
    ["w", 7, 7, 7, 6],
    ...pawnExchanges,
    ["b", 2, 4, 3, 4],
  ],
};

function scenarioAfter(sequence, perspective = "b") {
  let board = initialBoard();
  let hands = emptyHands();
  const history = [];
  for (const [originalOwner, ff, fr, tf, tr, promotion = "none"] of sequence) {
    const owner =
      perspective === "b" ? originalOwner : originalOwner === "b" ? "w" : "b";
    const candidate = {
      from: sq(ff, fr, owner),
      to: sq(tf, tr, owner),
      promotion,
    };
    const move = resolveLegalMove(board, hands, owner, candidate);
    assert.ok(move, `${originalOwner}: ${JSON.stringify(candidate)}`);
    const piece = board[move.from.r][move.from.c];
    history.push({
      ...move,
      owner,
      captured: board[move.to.r][move.to.c]?.type,
      pieceType: piece.type,
      promoted: !!piece.promoted,
      isDrop: false,
      givesCheck: false,
      optionalPromotion: false,
    });
    ({ board, hands } = applyMove(board, hands, move, owner));
  }
  return { board, hands, history };
}

for (const owner of ["b", "w"]) {
  for (const [id, sequence] of Object.entries(contextualSequences)) {
    test(`${id} checks real exchange history for ${owner}`, () => {
      const { board, history } = scenarioAfter(sequence, owner);
      const events = detectFormations(board, history, owner, []);
      assert.ok(
        events.some((event) => event.id === id),
        JSON.stringify(events),
      );
      const missingCaptures = history.map((entry) => ({
        ...entry,
        captured: undefined,
      }));
      assert.equal(
        detectFormations(board, missingCaptures, owner, []).some(
          (event) => event.id === id,
        ),
        false,
      );
      assert.equal(
        detectFormations(board, [], owner, []).some((event) => event.id === id),
        false,
      );
      for (const square of events.find((event) => event.id === id).squares) {
        const piece = board[square.r][square.c];
        board[square.r][square.c] = null;
        assert.equal(
          detectFormations(board, history, owner, []).some(
            (event) => event.id === id,
          ),
          false,
        );
        board[square.r][square.c] = piece;
      }
    });
  }
}

test("the catalog has an independent legal-move fixture for every formation", () => {
  const covered = new Set([
    ...Object.keys(sequences),
    ...Object.keys(contextualSequences),
  ]);
  assert.deepEqual(
    detectableFormations
      .map((formation) => formation.id)
      .filter((id) => !covered.has(id)),
    [],
  );
});

test("developed forms take priority, but the Mino progression can be discovered in order", () => {
  let recorded = [];
  for (let length = 1; length <= sequences.ginkan.length; length++) {
    const { board, history } = positionAfter(
      sequences.ginkan.slice(0, length),
      "b",
    );
    recorded = [
      ...recorded,
      ...detectFormations(board, history, "b", recorded),
    ];
  }
  assert.deepEqual(
    recorded
      .filter((event) =>
        ["kata_mino", "mino", "taka_mino", "ginkan"].includes(event.id),
      )
      .map((event) => event.id),
    ["kata_mino", "mino", "taka_mino", "ginkan"],
  );
  const developed = positionAfter(sequences.diamond_mino, "b");
  const events = detectFormations(developed.board, developed.history, "b", []);
  assert.ok(events.some((event) => event.id === "diamond_mino"));
  assert.equal(
    events.some((event) => ["mino", "kata_mino"].includes(event.id)),
    false,
  );
  const earlier = positionAfter(sequences.mino, "b");
  const regress = detectFormations(earlier.board, earlier.history, "b", [
    { id: "ginkan", owner: "b", ply: 30 },
  ]);
  assert.equal(
    regress.some((event) => ["mino", "kata_mino"].includes(event.id)),
    false,
  );
});

test("early Ishida expires after eight own moves, without disabling normal Ishida", () => {
  const { board, history } = positionAfter(sequences.hayaishida, "b");
  const late = [
    ...history,
    ...Array.from({ length: 5 }, () => ({
      owner: "b",
      pieceType: "K",
      to: sq(5, 9, "b"),
    })),
  ];
  assert.equal(
    detectFormations(board, late, "b", []).some(
      (event) => event.id === "hayaishida",
    ),
    false,
  );
  const normal = positionAfter(sequences.ishida, "b");
  assert.ok(
    detectFormations(normal.board, normal.history, "b", []).some(
      (event) => event.id === "ishida",
    ),
  );
});

test("a bishop exchange after an Aigakari pawn exchange is not Kakugawari", () => {
  const { board, history } = scenarioAfter([
    ...pawnExchanges,
    ["b", 2, 4, 2, 8],
    ["w", 2, 4, 2, 8],
    ["b", 7, 7, 7, 6],
    ["w", 7, 7, 7, 6],
    ["b", 8, 8, 2, 2, "must"],
    ["w", 7, 9, 8, 8],
  ]);
  assert.equal(
    detectFormations(board, history, "b", []).some(
      (event) => event.id === "kakugawari",
    ),
    false,
  );
});

test("the reducer records captures needed for exchange recognition", () => {
  for (const sequence of [bishopExchange, pawnExchanges]) {
    let state = createGameState("b");
    for (const [owner, ff, fr, tf, tr, promotion = "none"] of sequence) {
      assert.equal(state.turn, owner);
      if (owner === state.playerOwner) {
        state = gameReducer(state, { type: "square", ...sq(ff, fr, owner) });
        state = gameReducer(state, { type: "square", ...sq(tf, tr, owner) });
        if (state.pendingPromotion)
          state = gameReducer(state, {
            type: "promote",
            promote: promotion === "must",
          });
      } else {
        state = gameReducer(state, {
          type: "play",
          session: state.session,
          ply: state.history.length,
          move: { from: sq(ff, fr, owner), to: sq(tf, tr, owner), promotion },
        });
      }
    }
    assert.equal(state.history.length, sequence.length);
    const expected = sequence === bishopExchange ? "kakugawari" : "aigakari";
    assert.ok(state.formations.some((event) => event.id === expected));
    assert.equal(
      state.history.filter((entry) => entry.captured).length,
      sequence === bishopExchange ? 2 : 4,
    );
  }
});

test("catalog validation rejects typos, invalid squares, duplicates and broken progression", () => {
  const { parseFormationCatalog } = load("formations.js");
  const catalog = load("data/formations.json");
  assert.equal(parseFormationCatalog(catalog).length, formations.length);
  const mutations = [
    (copy) => {
      copy.version = 999;
    },
    (copy) => {
      copy.formations[0].id = copy.formations[1].id;
    },
    (copy) => {
      copy.formations[0].example[0][1] = 10;
    },
    (copy) => {
      copy.formations[0].example = [];
    },
    (copy) => {
      copy.formations[0].supersedes = ["mino", "mino"];
    },
    (copy) => {
      copy.formations[0].recognition.patterns[0].pieces.push(
        copy.formations[0].recognition.patterns[0].pieces[0],
      );
    },
    (copy) => {
      copy.formations[0].recognition.patterns[0].history = {
        bishopExhange: "any",
      };
    },
    (copy) => {
      copy.formations[0].supersedes = ["unknown"];
    },
    (copy) => {
      copy.formations[0].supersedes = [copy.formations[0].id];
    },
    (copy) => {
      copy.formations[0].supersedes = ["shikenbisha"];
    },
    (copy) => {
      delete copy.formations.find((entry) => entry.kind === "opening")
        .recognition.maxOwnMoves;
    },
  ];
  for (const mutate of mutations) {
    const copy = structuredClone(catalog);
    mutate(copy);
    assert.throws(
      () => parseFormationCatalog(copy),
      /Invalid formation catalog/,
    );
  }
  const expanded = structuredClone(catalog);
  expanded.formations.push({
    ...structuredClone(expanded.formations[0]),
    id: "new_castle",
    name: "追加用の囲い",
    aliases: [],
  });
  assert.equal(parseFormationCatalog(expanded).length, formations.length + 1);
});

test("reference-only entries are searchable metadata and cannot be unlocked or recorded", () => {
  const reference = formations.find((entry) => entry.recognition === null);
  assert.ok(reference);
  assert.ok(reference.family && reference.sources.length);
  assert.deepEqual(parseCollection(JSON.stringify([reference.id, "mino"])), [
    "mino",
  ]);
  assert.deepEqual(
    parseFormationRecords([{ id: reference.id, owner: "b", ply: 1 }]),
    [],
  );
  const { board, history } = positionAfter(sequences.mino, "b");
  assert.ok(
    detectFormations(board, history, "b", []).every((event) =>
      detectableFormations.some((entry) => entry.id === event.id),
    ),
  );
});

test("first-move recognition distinguishes the Ureshino opening from a later rearrangement", () => {
  for (const owner of ["b", "w"]) {
    const direct = positionAfter(sequences.ureshino, owner);
    assert.ok(
      detectFormations(direct.board, direct.history, owner, []).some(
        (event) => event.id === "ureshino",
      ),
    );
    const later = positionAfter([[1, 7, 1, 6], ...sequences.ureshino], owner);
    assert.equal(
      detectFormations(later.board, later.history, owner, []).some(
        (event) => event.id === "ureshino",
      ),
      false,
    );
  }
});

test("reference metadata validates parents, aliases and the boundary with auto detection", () => {
  const { parseFormationCatalog } = load("formations.js");
  const catalog = load("data/formations.json");
  const mutateCases = [
    (copy) => {
      copy.formations[1].name = copy.formations[0].name;
    },
    (copy) => {
      copy.formations[0].parentId = "unknown";
    },
    (copy) => {
      copy.formations[0].parentId = copy.formations[0].id;
    },
    (copy) => {
      copy.formations[0].aliases = ["別名", "別名"];
    },
    (copy) => {
      copy.formations.find((entry) => entry.recognition === null).supersedes = [
        "mino",
      ];
    },
    (copy) => {
      copy.formations.find((entry) => entry.recognition === null).family = "";
    },
  ];
  for (const mutate of mutateCases) {
    const copy = structuredClone(catalog);
    mutate(copy);
    assert.throws(
      () => parseFormationCatalog(copy),
      /Invalid formation catalog/,
    );
  }
});
