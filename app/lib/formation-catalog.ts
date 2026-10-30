import catalog from "./data/formations.json";
import type { FormationId, PieceType } from "./types";
import { isRecord } from "./validation";

// All coordinates are sente file/rank numbers. The detector rotates for gote.
export type Placement = readonly [PieceType, number, number];
export type OriginalPlacement = readonly [
  PieceType,
  number,
  number,
  number,
  number,
];
export type HistoricalMove = readonly [
  PieceType,
  number,
  number,
  number,
  number,
  PieceType?,
];
export type HistoryConditions = {
  bishopExchange?: "any" | "before-pawn-exchange";
  staticRooks?: boolean;
  bishopsPresent?: boolean;
  pawnExchanges?: "both" | "self";
  firstMove?: HistoricalMove;
  moves?: readonly HistoricalMove[];
};
export type FormationPattern = {
  pieces: readonly Placement[];
  opponentPieces?: readonly Placement[];
  originals?: readonly OriginalPlacement[];
  history?: HistoryConditions;
};
export type Formation = {
  id: FormationId;
  name: string;
  reading: string;
  kind: "castle" | "opening";
  tagline: string;
  description: string;
  example: readonly Placement[];
  sources: readonly string[];
  family: string;
  aliases: readonly string[];
  parentId?: FormationId;
  supersedes?: readonly FormationId[];
  recognition: {
    mirror: boolean;
    maxOwnMoves?: number;
    patterns: readonly FormationPattern[];
  } | null;
};

const pieceTypes = new Set(["P", "L", "N", "S", "G", "B", "R", "K"]);
function requireValue(condition: unknown, path: string): asserts condition {
  if (!condition) throw new Error(`Invalid formation catalog: ${path}`);
}
function object(
  value: unknown,
  keys: string[],
  path: string,
): asserts value is Record<string, unknown> {
  requireValue(isRecord(value), path);
  requireValue(
    Object.keys(value).every((key) => keys.includes(key)),
    `${path}: unknown field`,
  );
}
function tuples(
  value: unknown,
  length: number,
  path: string,
  optionalCapture = false,
) {
  requireValue(Array.isArray(value), path);
  for (const tuple of value) {
    requireValue(
      Array.isArray(tuple) &&
        (tuple.length === length ||
          (optionalCapture && tuple.length === length + 1)),
      path,
    );
    requireValue(pieceTypes.has(tuple[0]), `${path}: piece`);
    requireValue(
      tuple
        .slice(1, length)
        .every(
          (coordinate: unknown) =>
            Number.isInteger(coordinate) &&
            Number(coordinate) >= 1 &&
            Number(coordinate) <= 9,
        ),
      `${path}: coordinates`,
    );
    if (tuple.length > length)
      requireValue(pieceTypes.has(tuple[length]), `${path}: capture`);
  }
}
function placements(value: unknown, path: string) {
  tuples(value, 3, path);
  const squares = (value as Placement[]).map(
    ([, file, rank]) => `${file}:${rank}`,
  );
  requireValue(
    new Set(squares).size === squares.length,
    `${path}: duplicate square`,
  );
}

// Validate on load as well as in tests: a misspelled condition must never be
// silently ignored and make an opening easier to award.
export function parseFormationCatalog(value: unknown): readonly Formation[] {
  object(value, ["$schema", "version", "formations"], "root");
  requireValue(
    value.version === 2 &&
      Array.isArray(value.formations) &&
      value.formations.length > 0,
    "version/formations",
  );
  const ids = new Set<string>();
  const names = new Set<string>();
  for (const entry of value.formations) {
    object(
      entry,
      [
        "id",
        "name",
        "reading",
        "kind",
        "tagline",
        "description",
        "example",
        "sources",
        "supersedes",
        "recognition",
        "family",
        "aliases",
        "parentId",
      ],
      "formation",
    );
    for (const key of ["id", "name", "family"]) {
      requireValue(
        typeof entry[key] === "string" &&
          (entry[key] as string).trim().length > 0,
        key,
      );
    }
    requireValue(
      /^[a-z][a-z0-9_]*$/.test(entry.id as string) &&
        !ids.has(entry.id as string),
      "unique id",
    );
    ids.add(entry.id as string);
    const reference = entry.recognition === null;
    for (const key of ["reading", "tagline", "description"]) {
      requireValue(
        (reference && entry[key] === undefined) ||
          (typeof entry[key] === "string" &&
            (entry[key] as string).trim().length > 0),
        `${entry.id}: ${key}`,
      );
    }
    requireValue(
      entry.kind === "castle" || entry.kind === "opening",
      `${entry.id}: kind`,
    );
    const nameKey = `${entry.kind}:${(entry.name as string).normalize("NFKC").toLowerCase().replace(/\s+/g, "")}`;
    requireValue(
      !names.has(nameKey),
      `${entry.id}: duplicate name; use aliases`,
    );
    names.add(nameKey);
    if (!reference || entry.example !== undefined) {
      placements(entry.example, `${entry.id}: example`);
      requireValue(
        (entry.example as Placement[]).length > 0,
        `${entry.id}: empty example`,
      );
    }
    if (entry.aliases !== undefined)
      requireValue(
        Array.isArray(entry.aliases) &&
          entry.aliases.every(
            (alias) => typeof alias === "string" && alias.trim(),
          ) &&
          new Set(entry.aliases).size === entry.aliases.length,
        `${entry.id}: aliases`,
      );
    if (entry.parentId !== undefined)
      requireValue(typeof entry.parentId === "string", `${entry.id}: parentId`);
    requireValue(
      Array.isArray(entry.sources) &&
        entry.sources.length > 0 &&
        entry.sources.every(
          (source) => typeof source === "string" && /^https?:\/\//.test(source),
        ),
      `${entry.id}: sources`,
    );
    if (entry.supersedes !== undefined)
      requireValue(
        Array.isArray(entry.supersedes) &&
          entry.supersedes.every((id) => typeof id === "string") &&
          new Set(entry.supersedes).size === entry.supersedes.length,
        `${entry.id}: supersedes`,
      );
    if (reference) {
      requireValue(
        !entry.supersedes || (entry.supersedes as string[]).length === 0,
        `${entry.id}: reference cannot suppress playable forms`,
      );
      continue;
    }
    const rule = entry.recognition;
    object(
      rule,
      ["mirror", "maxOwnMoves", "patterns"],
      `${entry.id}: recognition`,
    );
    requireValue(typeof rule.mirror === "boolean", `${entry.id}: mirror`);
    if (rule.maxOwnMoves !== undefined)
      requireValue(
        Number.isInteger(rule.maxOwnMoves) &&
          Number(rule.maxOwnMoves) > 0 &&
          Number(rule.maxOwnMoves) <= 100,
        `${entry.id}: maxOwnMoves`,
      );
    requireValue(
      entry.kind !== "opening" || rule.maxOwnMoves !== undefined,
      `${entry.id}: opening move limit`,
    );
    requireValue(
      Array.isArray(rule.patterns) && rule.patterns.length > 0,
      `${entry.id}: patterns`,
    );
    for (const pattern of rule.patterns) {
      object(
        pattern,
        ["pieces", "opponentPieces", "originals", "history"],
        `${entry.id}: pattern`,
      );
      placements(pattern.pieces, `${entry.id}: pieces`);
      requireValue(
        (pattern.pieces as Placement[]).length > 0,
        `${entry.id}: empty pieces`,
      );
      if (pattern.opponentPieces !== undefined)
        placements(pattern.opponentPieces, `${entry.id}: opponentPieces`);
      if (pattern.originals !== undefined) {
        tuples(pattern.originals, 5, `${entry.id}: originals`);
        for (const [
          type,
          ,
          ,
          file,
          rank,
        ] of pattern.originals as OriginalPlacement[]) {
          requireValue(
            (pattern.pieces as Placement[]).some(
              ([t, f, r]) => t === type && f === file && r === rank,
            ),
            `${entry.id}: original target must be a required piece`,
          );
        }
      }
      if (pattern.history !== undefined) {
        const history = pattern.history;
        object(
          history,
          [
            "bishopExchange",
            "staticRooks",
            "bishopsPresent",
            "pawnExchanges",
            "moves",
            "firstMove",
          ],
          `${entry.id}: history`,
        );
        if (history.bishopExchange !== undefined)
          requireValue(
            ["any", "before-pawn-exchange"].includes(
              history.bishopExchange as string,
            ),
            `${entry.id}: bishopExchange`,
          );
        for (const key of ["staticRooks", "bishopsPresent"])
          if (history[key] !== undefined)
            requireValue(
              typeof history[key] === "boolean",
              `${entry.id}: ${key}`,
            );
        if (history.pawnExchanges !== undefined)
          requireValue(
            history.pawnExchanges === "both" ||
              history.pawnExchanges === "self",
            `${entry.id}: pawnExchanges`,
          );
        if (history.moves !== undefined)
          tuples(history.moves, 5, `${entry.id}: history moves`, true);
        if (history.firstMove !== undefined)
          tuples([history.firstMove], 5, `${entry.id}: firstMove`, true);
      }
    }
  }
  const result = value.formations.map((entry) => ({
    ...entry,
    reading: entry.reading ?? "",
    tagline: entry.tagline ?? "",
    description: entry.description ?? "",
    example: entry.example ?? [],
    aliases: entry.aliases ?? [],
  })) as Formation[];
  const byId = new Map(result.map((entry) => [entry.id, entry]));
  function visit(id: string, ancestors: Set<string>) {
    requireValue(!ancestors.has(id), `supersedes cycle at ${id}`);
    const entry = byId.get(id);
    requireValue(entry, `unknown supersedes id ${id}`);
    const next = new Set([...ancestors, id]);
    for (const parent of entry.supersedes ?? []) {
      requireValue(
        byId.get(parent)?.kind === entry.kind,
        `${id}: supersedes kind`,
      );
      visit(parent, next);
    }
  }
  for (const id of ids) visit(id, new Set());
  function visitParent(id: string, ancestors: Set<string>) {
    requireValue(!ancestors.has(id), `parent cycle at ${id}`);
    const entry = byId.get(id);
    requireValue(entry, `unknown parent ${id}`);
    if (!entry.parentId) return;
    requireValue(
      byId.get(entry.parentId)?.kind === entry.kind,
      `${id}: parent kind`,
    );
    visitParent(entry.parentId, new Set([...ancestors, id]));
  }
  for (const id of ids) visitParent(id, new Set());
  return result;
}

export const formations = parseFormationCatalog(catalog);
export const detectableFormations = formations.filter(
  (formation) => formation.recognition !== null,
);
