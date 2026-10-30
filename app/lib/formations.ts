import type {
  Board,
  FormationEvent,
  FormationId,
  FormationRecord,
  KifuEntry,
  Move,
  Owner,
  PieceType,
} from "./types";
import { isOwner, isRecord } from "./validation";
import { formations, detectableFormations } from "./formation-catalog";
import type {
  Formation,
  HistoricalMove,
  HistoryConditions,
  Placement,
} from "./formation-catalog";
export {
  formations,
  detectableFormations,
  parseFormationCatalog,
} from "./formation-catalog";
export type { Formation } from "./formation-catalog";

export const FORMATIONS_KEY = "shogi-formations";
const byId = new Map(formations.map((formation) => [formation.id, formation]));
export const formationById = (id: FormationId) => byId.get(id)!;
const isFormationId = (id: unknown): id is FormationId =>
  detectableFormations.some((item) => item.id === id);

export function parseCollection(saved: string | null): FormationId[] {
  try {
    const value: unknown = JSON.parse(saved ?? "null");
    return Array.isArray(value)
      ? [...new Set(value.filter(isFormationId))]
      : [];
  } catch {
    return [];
  }
}

export function parseFormationRecords(value: unknown): FormationRecord[] {
  if (!Array.isArray(value)) return [];
  const records: FormationRecord[] = [];
  for (const item of value.slice(0, detectableFormations.length * 2)) {
    if (
      !isRecord(item) ||
      !isFormationId(item.id) ||
      !isOwner(item.owner) ||
      !Number.isInteger(item.ply) ||
      (item.ply as number) < 1 ||
      (item.ply as number) > 10000 ||
      records.some(
        (record) => record.id === item.id && record.owner === item.owner,
      )
    )
      continue;
    records.push({ id: item.id, owner: item.owner, ply: item.ply as number });
  }
  return records;
}

export const formationSquare = (
  file: number,
  rank: number,
  owner: Owner,
): Move["to"] =>
  owner === "b" ? { r: rank - 1, c: 9 - file } : { r: 9 - rank, c: file - 1 };

const sameSquare = (
  a: Move["to"] | undefined | null,
  b: Move["to"] | undefined | null,
) => !!a && !!b && a.r === b.r && a.c === b.c;

// Track the original rook/right silver/pawn, so a captured and later dropped
// piece cannot accidentally turn an endgame arrangement into an opening.
function originalPiece(
  history: KifuEntry[],
  owner: Owner,
  file: number,
  rank: number,
) {
  let square = formationSquare(file, rank, owner);
  for (const entry of history) {
    if (entry.owner !== owner && sameSquare(entry.to, square)) return null;
    if (
      entry.owner === owner &&
      !entry.isDrop &&
      sameSquare(entry.from, square)
    ) {
      if (entry.promotion === "must" || entry.promoted) return null;
      square = entry.to;
    }
  }
  return square;
}

// A real exchange requires both original bishops to be captured on consecutive
// plies. Simply taking a bishop (or losing it) is not a bishop exchange.
function bishopExchangeIndex(history: KifuEntry[]) {
  for (let i = 1; i < history.length; i++) {
    const attack = history[i - 1];
    const recapture = history[i];
    if (
      attack.pieceType !== "B" ||
      attack.captured !== "B" ||
      attack.isDrop ||
      recapture.captured !== "B" ||
      attack.owner === recapture.owner ||
      !sameSquare(attack.to, recapture.to)
    )
      continue;
    const before = history.slice(0, i - 1);
    if (
      sameSquare(originalPiece(before, attack.owner, 8, 8), attack.from!) &&
      sameSquare(originalPiece(before, recapture.owner, 8, 8), attack.to)
    )
      return i;
  }
  return -1;
}

// The original file pawn advances, the opposing original pawn captures it,
// and the original rook recaptures. This is stronger than an empty pawn square.
function pawnExchangeIndex(history: KifuEntry[], owner: Owner) {
  for (let i = 0; i + 2 < history.length; i++) {
    const [advance, capture, recapture] = history.slice(i, i + 3);
    if (
      advance.owner !== owner ||
      advance.pieceType !== "P" ||
      advance.isDrop ||
      !sameSquare(advance.from, formationSquare(2, 5, owner)) ||
      !sameSquare(advance.to, formationSquare(2, 4, owner)) ||
      capture.owner === owner ||
      capture.pieceType !== "P" ||
      capture.captured !== "P" ||
      !sameSquare(capture.from, formationSquare(2, 3, owner)) ||
      !sameSquare(capture.to, advance.to) ||
      recapture.owner !== owner ||
      recapture.pieceType !== "R" ||
      recapture.captured !== "P" ||
      !sameSquare(recapture.to, advance.to)
    )
      continue;
    const before = history.slice(0, i);
    if (
      sameSquare(originalPiece(before, owner, 2, 7), advance.from!) &&
      sameSquare(originalPiece(before, capture.owner, 8, 7), capture.from!) &&
      sameSquare(
        originalPiece(history.slice(0, i + 2), owner, 2, 8),
        recapture.from!,
      )
    )
      return i + 2;
  }
  return -1;
}

function historyMatcher(board: Board, history: KifuEntry[], owner: Owner) {
  const cache = new Map<string, boolean>();
  const positions = new Map<string, Move["to"] | null>();
  const originalFor = (side: Owner, file: number, rank: number) => {
    const key = `${side}:${file}:${rank}`;
    if (!positions.has(key))
      positions.set(key, originalPiece(history, side, file, rank));
    return positions.get(key)!;
  };
  const fact = (key: string, compute: () => boolean) => {
    if (!cache.has(key)) cache.set(key, compute());
    return cache.get(key)!;
  };
  const alive = (side: Owner, type: PieceType, file: number, rank: number) => {
    const square = originalFor(side, file, rank);
    const piece = square && board[square.r][square.c];
    return (
      !!piece && piece.owner === side && piece.type === type && !piece.promoted
    );
  };
  const staticRook = (side: Owner) => {
    if (!alive(side, "R", 2, 8)) return false;
    let square = formationSquare(2, 8, side);
    for (const entry of history) {
      if (
        entry.owner === side &&
        entry.pieceType === "R" &&
        !entry.isDrop &&
        sameSquare(entry.from, square)
      ) {
        if (entry.to.c !== square.c) return false;
        square = entry.to;
      }
    }
    return true;
  };
  const rangingRook = (side: Owner) => {
    if (!alive(side, "R", 2, 8)) return false;
    let square = formationSquare(2, 8, side);
    let ranged = false;
    for (const entry of history) {
      if (
        entry.owner !== side ||
        entry.isDrop ||
        entry.pieceType !== "R" ||
        !sameSquare(entry.from, square)
      )
        continue;
      const fromRank = side === "b" ? square.r + 1 : 9 - square.r;
      const toRank = side === "b" ? entry.to.r + 1 : 9 - entry.to.r;
      const toFile = side === "b" ? 9 - entry.to.c : entry.to.c + 1;
      // A rook moving sideways in the middle of the board or along the back
      // rank (Subway Rook) is not evidence of a ranging-rook opening.
      if (
        fromRank === 8 &&
        toRank === 8 &&
        toFile >= 5 &&
        square.c !== entry.to.c &&
        !entry.captured
      )
        ranged = true;
      square = entry.to;
    }
    return ranged;
  };
  return (conditions: HistoryConditions | undefined, mirror: boolean) => {
    if (!conditions) return true;
    const opponent = owner === "b" ? "w" : "b";
    const moveMatches = (
      entry: KifuEntry,
      move: HistoricalMove,
      side: Owner,
    ) => {
      const [type, ff, fr, tf, tr, captured] = move;
      return (
        entry.owner === side &&
        !entry.isDrop &&
        !entry.promoted &&
        entry.pieceType === type &&
        sameSquare(
          entry.from,
          formationSquare(mirror ? 10 - ff : ff, fr, side),
        ) &&
        sameSquare(
          entry.to,
          formationSquare(mirror ? 10 - tf : tf, tr, side),
        ) &&
        (captured === undefined || entry.captured === captured)
      );
    };
    const rookOnFiles = (side: Owner, files: readonly number[] | undefined) => {
      if (!files) return true;
      const square = originalFor(side, 2, 8);
      if (!square || !alive(side, "R", 2, 8)) return false;
      const file = side === "b" ? 9 - square.c : square.c + 1;
      return files.includes(mirror ? 10 - file : file);
    };
    if (
      !rookOnFiles(owner, conditions.rookFiles) ||
      !rookOnFiles(opponent, conditions.opponentRookFiles)
    )
      return false;
    if (
      conditions.rangingRooks &&
      !fact(
        `ranging:${conditions.rangingRooks}`,
        () =>
          (conditions.rangingRooks === "opponent" || rangingRook(owner)) &&
          (conditions.rangingRooks === "self" || rangingRook(opponent)),
      )
    )
      return false;
    if (conditions.orderedMoves) {
      let index = 0;
      for (const entry of history)
        if (
          index < conditions.orderedMoves.length &&
          moveMatches(entry, conditions.orderedMoves[index], owner)
        )
          index++;
      if (index !== conditions.orderedMoves.length) return false;
    }
    if (
      !(conditions.opponentMoves ?? []).every((move) =>
        history.some((entry) => moveMatches(entry, move, opponent)),
      )
    )
      return false;
    if (
      !(conditions.drops ?? []).every(([type, file, rank]) =>
        history.some(
          (entry) =>
            entry.owner === owner &&
            entry.isDrop &&
            entry.pieceType === type &&
            sameSquare(
              entry.to,
              formationSquare(mirror ? 10 - file : file, rank, owner),
            ),
        ),
      )
    )
      return false;
    if (
      conditions.staticRooks &&
      !fact("staticRooks", () => staticRook("b") && staticRook("w"))
    )
      return false;
    if (
      conditions.bishopsPresent &&
      !fact(
        "bishopsPresent",
        () => alive("b", "B", 8, 8) && alive("w", "B", 8, 8),
      )
    )
      return false;
    if (
      conditions.pawnExchanges &&
      !fact(`pawnExchanges:${conditions.pawnExchanges}`, () =>
        conditions.pawnExchanges === "self"
          ? pawnExchangeIndex(history, owner) >= 0
          : pawnExchangeIndex(history, "b") >= 0 &&
            pawnExchangeIndex(history, "w") >= 0,
      )
    )
      return false;
    if (
      conditions.bishopExchange &&
      !fact(conditions.bishopExchange, () => {
        const exchange = bishopExchangeIndex(history);
        if (exchange < 0) return false;
        return (
          conditions.bishopExchange === "any" ||
          (["b", "w"] as const).every((side) => {
            const pawnExchange = pawnExchangeIndex(history, side);
            return pawnExchange < 0 || pawnExchange > exchange;
          })
        );
      })
    )
      return false;
    for (const [move, side] of [
      [conditions.firstMove, owner],
      [conditions.opponentFirstMove, opponent],
    ] as const) {
      if (!move) continue;
      const first = history.find((entry) => entry.owner === side);
      if (!first || !moveMatches(first, move, side)) return false;
    }
    return (conditions.moves ?? []).every((move) =>
      history.some((entry) => moveMatches(entry, move, owner)),
    );
  };
}

export function detectFormations(
  board: Board,
  history: KifuEntry[],
  owner: Owner,
  recorded: FormationRecord[],
): FormationEvent[] {
  if (!history.length) return [];
  const candidates: FormationEvent[] = [];
  const ownMoves = history.filter((entry) => entry.owner === owner).length;
  const matchesHistory = historyMatcher(board, history, owner);
  const originals = new Map<string, Move["to"] | null>();
  const original = (file: number, rank: number) => {
    const key = `${file}:${rank}`;
    if (!originals.has(key))
      originals.set(key, originalPiece(history, owner, file, rank));
    return originals.get(key)!;
  };
  const has = (placement: Placement, side: Owner, mirror: boolean) => {
    const [type, file, rank] = placement;
    const square = formationSquare(mirror ? 10 - file : file, rank, owner);
    const piece = board[square.r][square.c];
    return piece?.owner === side && piece.type === type && !piece.promoted;
  };
  // Dependencies match the current position even when already collected or
  // suppressed. A prior event alone never proves a dependent shape still exists.
  const matches = new Map<string, FormationEvent | null>();
  const matchFormation = (formation: Formation): FormationEvent | null => {
    if (matches.has(formation.id)) return matches.get(formation.id)!;
    const rule = formation.recognition;
    if (
      !rule ||
      (rule.owner !== undefined && rule.owner !== owner) ||
      (rule.minOwnMoves !== undefined && ownMoves < rule.minOwnMoves)
    )
      return null;
    if (
      rule.maxOwnMoves !== undefined &&
      (!ownMoves || ownMoves > rule.maxOwnMoves)
    )
      return null;
    let match: FormationEvent | undefined;
    for (const mirror of rule.mirror ? [false, true] : [false]) {
      for (const pattern of rule.patterns) {
        if (
          !pattern.pieces.every((piece) => has(piece, owner, mirror)) ||
          !(pattern.opponentPieces ?? []).every((piece) =>
            has(piece, owner === "b" ? "w" : "b", mirror),
          ) ||
          !(pattern.emptySquares ?? []).every(([file, rank]) => {
            const square = formationSquare(
              mirror ? 10 - file : file,
              rank,
              owner,
            );
            return board[square.r][square.c] === null;
          }) ||
          !(pattern.requires ?? []).every((id) =>
            matchFormation(byId.get(id)!),
          ) ||
          !(pattern.originals ?? []).every(([, ff, fr, tf, tr]) =>
            sameSquare(
              original(mirror ? 10 - ff : ff, fr),
              formationSquare(mirror ? 10 - tf : tf, tr, owner),
            ),
          ) ||
          !matchesHistory(pattern.history, mirror)
        )
          continue;
        match = {
          id: formation.id,
          owner,
          ply: history.length,
          squares: pattern.pieces.map(([, file, rank]) =>
            formationSquare(mirror ? 10 - file : file, rank, owner),
          ),
        };
        break;
      }
      if (match) break;
    }
    matches.set(formation.id, match ?? null);
    return match ?? null;
  };
  for (const formation of detectableFormations) {
    if (
      recorded.some(
        (record) => record.id === formation.id && record.owner === owner,
      )
    )
      continue;
    const match = matchFormation(formation);
    if (match) candidates.push(match);
  }
  // Prefer a developed form when several match at once. Once a developed form
  // was recorded, dismantling it must not award an earlier stage for the first time.
  const suppressed = new Set<string>();
  function suppressParents(id: string) {
    for (const parent of byId.get(id)?.supersedes ?? []) {
      if (suppressed.has(parent)) continue;
      suppressed.add(parent);
      suppressParents(parent);
    }
  }
  for (const record of [...recorded, ...candidates])
    if (record.owner === owner) suppressParents(record.id);
  return candidates.filter((event) => !suppressed.has(event.id));
}
