import path from "node:path";
import { createRequire } from "node:module";
import { withCompiledLibrary } from "./compile-lib.mjs";

const loadModule = createRequire(import.meta.url);
withCompiledLibrary((output) => {
  const { initialBoard, emptyHands } = loadModule(
    path.join(output, "board.js"),
  );
  const { buildLegalMoves, isInCheck } = loadModule(
    path.join(output, "rules.js"),
  );
  const { minimax, orderMoves } = loadModule(path.join(output, "search.js"));
  const board = initialBoard();
  const hands = emptyHands();
  const moves = buildLegalMoves(board, hands, "b");
  const benchmark = (name, iterations, run) => {
    for (let i = 0; i < 5; i++) run();
    const times = Array.from({ length: 5 }, () => {
      const start = performance.now();
      for (let i = 0; i < iterations; i++) run();
      return performance.now() - start;
    }).sort((a, b) => a - b);
    console.log(
      `${name}: ${times[2].toFixed(2)} ms / ${iterations} iterations (median of 5)`,
    );
  };
  console.log(
    `${process.version} ${process.platform}/${process.arch}; initial position`,
  );
  benchmark("Check detection", 10000, () => isInCheck(board, "b"));
  benchmark("Legal move generation", 500, () =>
    buildLegalMoves(board, hands, "b"),
  );
  benchmark("Move ordering", 500, () => orderMoves(board, hands, "b", moves));
  benchmark("Fixed depth 2 search", 10, () =>
    minimax(board, hands, 2, -Infinity, Infinity, false),
  );
});
