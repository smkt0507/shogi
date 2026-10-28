import type {
  Board,
  EvaluationEntry,
  GameOutcome,
  Hands,
  KifuEntry,
  Move,
  Owner,
  PieceType,
  PositionEvaluation,
} from "./types";
import { initialBoard, emptyHands } from "./board";
import { applyMove, getMovePromotion } from "./moves";
import {
  getLegalDropMoves,
  getLegalMovesForPiece,
  hasLegalMove,
  isInCheck,
  opponentOf,
  resolveLegalMove,
} from "./rules";
import { localEvaluation } from "./analysis";
import { positionKey } from "./position";

export type GameState = {
  session: number;
  playerOwner: Owner;
  board: Board;
  hands: Hands;
  turn: Owner;
  selected: Move["to"] | null;
  selectedDrop: PieceType | null;
  legalMoves: Move[];
  pendingPromotion: Move | null;
  lastMove: Move | null;
  history: KifuEntry[];
  evaluations: EvaluationEntry[];
  positionKeys: string[];
  checkStatus: Record<Owner, boolean>;
  outcome: GameOutcome | null;
};

export type GameAction =
  | { type: "square"; r: number; c: number }
  | { type: "drop"; piece: PieceType }
  | { type: "promote"; promote: boolean }
  | { type: "play"; move: Move; session: number; ply: number }
  | {
      type: "evaluation";
      evaluation: PositionEvaluation;
      session: number;
      ply: number;
    }
  | { type: "reset" };

export const createGameState = (playerOwner: Owner, session = 0): GameState => {
  const board = initialBoard();
  const hands = emptyHands();
  return {
    session,
    playerOwner,
    board,
    hands,
    turn: "b",
    selected: null,
    selectedDrop: null,
    legalMoves: [],
    pendingPromotion: null,
    lastMove: null,
    history: [],
    outcome: null,
    evaluations: [localEvaluation(board, hands, 0)],
    checkStatus: { b: false, w: false },
    positionKeys: [positionKey(board, hands, "b")],
  };
};

export const repetitionOutcome = (
  keys: string[],
  history: KifuEntry[],
): GameOutcome | null => {
  const lastKey = keys.at(-1);
  const occurrences = keys.flatMap((key, index) =>
    key === lastKey ? [index] : [],
  );
  if (occurrences.length < 4) return null;
  const repeatedMoves = history.slice(occurrences.at(-4));
  for (const owner of ["b", "w"] as const) {
    const ownMoves = repeatedMoves.filter((entry) => entry.owner === owner);
    if (ownMoves.length && ownMoves.every((entry) => entry.givesCheck)) {
      return { winner: opponentOf(owner), reason: "perpetual-check" };
    }
  }
  return { winner: null, reason: "repetition" };
};

const commitMove = (state: GameState, move: Move): GameState => {
  const owner = state.turn;
  const movedPiece = move.from ? state.board[move.from.r][move.from.c] : null;
  const pieceType = move.drop ?? movedPiece?.type;
  if (!pieceType) return state;
  const { board, hands } = applyMove(state.board, state.hands, move, owner);
  const turn = opponentOf(owner);
  const checkStatus = { b: isInCheck(board, "b"), w: isInCheck(board, "w") };
  const history: KifuEntry[] = [
    ...state.history,
    {
      owner,
      pieceType,
      promoted: !!movedPiece?.promoted,
      isDrop: !!move.drop,
      to: move.to,
      promotion: move.promotion,
      givesCheck: checkStatus[turn],
      optionalPromotion: !!(
        movedPiece &&
        move.from &&
        getMovePromotion(movedPiece, move.from.r, move.to.r) === "optional"
      ),
    },
  ];
  const positionKeys = [...state.positionKeys, positionKey(board, hands, turn)];
  const outcome = !hasLegalMove(board, hands, turn)
    ? {
        winner: owner,
        reason: checkStatus[turn]
          ? ("checkmate" as const)
          : ("no-moves" as const),
      }
    : repetitionOutcome(positionKeys, history);
  return {
    ...state,
    board,
    hands,
    turn,
    history,
    positionKeys,
    checkStatus,
    outcome,
    selected: null,
    selectedDrop: null,
    legalMoves: [],
    pendingPromotion: null,
    lastMove: move,
    evaluations: [
      ...state.evaluations,
      outcome?.reason === "checkmate" && outcome.winner
        ? {
            ply: history.length,
            score: outcome.winner === "b" ? 100000 : -100000,
            source: "local",
          }
        : localEvaluation(board, hands, history.length),
    ],
  };
};

export const gameReducer = (
  state: GameState,
  action: GameAction,
): GameState => {
  if (action.type === "reset")
    return createGameState(state.playerOwner, state.session + 1);
  if (action.type === "evaluation") {
    if (
      action.session !== state.session ||
      !state.evaluations[action.ply] ||
      !Number.isFinite(action.evaluation.score)
    )
      return state;
    const previous = state.evaluations[action.ply];
    if (
      previous.score === action.evaluation.score &&
      previous.source === action.evaluation.source
    )
      return state;
    const evaluations = [...state.evaluations];
    evaluations[action.ply] = { ...action.evaluation, ply: action.ply };
    return { ...state, evaluations };
  }
  if (state.outcome) return state;
  if (action.type === "play") {
    if (
      action.session !== state.session ||
      action.ply !== state.history.length ||
      state.turn === state.playerOwner
    )
      return state;
    const move = resolveLegalMove(
      state.board,
      state.hands,
      state.turn,
      action.move,
    );
    return move ? commitMove(state, move) : state;
  }
  if (state.turn !== state.playerOwner) return state;
  if (action.type === "promote") {
    if (!state.pendingPromotion) return state;
    return commitMove(state, {
      ...state.pendingPromotion,
      promotion: action.promote ? "must" : "none",
    });
  }
  if (state.pendingPromotion) return state;
  if (action.type === "drop") {
    if (state.hands[state.turn][action.piece] <= 0) return state;
    if (state.selectedDrop === action.piece)
      return { ...state, selectedDrop: null, legalMoves: [] };
    return {
      ...state,
      selected: null,
      selectedDrop: action.piece,
      legalMoves: getLegalDropMoves(
        state.board,
        state.hands,
        state.turn,
      ).filter((move) => move.drop === action.piece),
    };
  }
  const { r, c } = action;
  if (r < 0 || r >= 9 || c < 0 || c >= 9) return state;
  const candidate = state.legalMoves.find(
    (move) => move.to.r === r && move.to.c === c,
  );
  if (candidate) {
    return candidate.promotion === "optional"
      ? { ...state, pendingPromotion: candidate }
      : commitMove(state, candidate);
  }
  if (state.board[r][c]?.owner === state.turn) {
    if (state.selected?.r === r && state.selected.c === c)
      return { ...state, selected: null, legalMoves: [] };
    return {
      ...state,
      selected: { r, c },
      selectedDrop: null,
      legalMoves: getLegalMovesForPiece(
        state.board,
        state.hands,
        state.turn,
        r,
        c,
      ),
    };
  }
  return { ...state, selected: null, selectedDrop: null, legalMoves: [] };
};
