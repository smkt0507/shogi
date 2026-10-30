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
import type { HistoryConditions, Placement } from "./formation-catalog";
export {
  formations,
  detectableFormations,
  parseFormationCatalog,
} from "./formation-catalog";
export type { Formation } from "./formation-catalog";

export const FORMATIONS_KEY = "shogi-formations";
export const formationById = (id: FormationId) =>
  formations.find((item) => item.id === id)!;
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
  const fact = (key: string, compute: () => boolean) => {
    if (!cache.has(key)) cache.set(key, compute());
    return cache.get(key)!;
  };
  const alive = (side: Owner, type: PieceType, file: number, rank: number) => {
    const square = originalPiece(history, side, file, rank);
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
  return (conditions: HistoryConditions | undefined, mirror: boolean) => {
    if (!conditions) return true;
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
    if (conditions.firstMove) {
      const [type, ff, fr, tf, tr, captured] = conditions.firstMove;
      const first = history.find((entry) => entry.owner === owner);
      if (
        !first ||
        first.isDrop ||
        first.pieceType !== type ||
        !sameSquare(
          first.from,
          formationSquare(mirror ? 10 - ff : ff, fr, owner),
        ) ||
        !sameSquare(
          first.to,
          formationSquare(mirror ? 10 - tf : tf, tr, owner),
        ) ||
        (captured !== undefined && first.captured !== captured)
      )
        return false;
    }
    return (conditions.moves ?? []).every(([type, ff, fr, tf, tr, captured]) =>
      history.some(
        (entry) =>
          entry.owner === owner &&
          entry.pieceType === type &&
          !entry.isDrop &&
          sameSquare(
            entry.from,
            formationSquare(mirror ? 10 - ff : ff, fr, owner),
          ) &&
          sameSquare(
            entry.to,
            formationSquare(mirror ? 10 - tf : tf, tr, owner),
          ) &&
          (captured === undefined || entry.captured === captured),
      ),
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
  for (const formation of detectableFormations) {
    if (
      recorded.some(
        (record) => record.id === formation.id && record.owner === owner,
      )
    )
      continue;
    const rule = formation.recognition;
    if (!rule) continue;
    if (
      rule.maxOwnMoves !== undefined &&
      (!ownMoves || ownMoves > rule.maxOwnMoves)
    )
      continue;
    let match: FormationEvent | undefined;
    for (const mirror of rule.mirror ? [false, true] : [false]) {
      for (const pattern of rule.patterns) {
        if (
          !pattern.pieces.every((piece) => has(piece, owner, mirror)) ||
          !(pattern.opponentPieces ?? []).every((piece) =>
            has(piece, owner === "b" ? "w" : "b", mirror),
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
    if (match) candidates.push(match);
  }
  // Prefer a developed form when several match at once. Once a developed form
  // was recorded, dismantling it must not award an earlier stage for the first time.
  const suppressed = new Set<string>();
  const byId = new Map(
    formations.map((formation) => [formation.id, formation]),
  );
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
