export type Owner = "b" | "w";
export type PieceType = "P" | "L" | "N" | "S" | "G" | "B" | "R" | "K";
export type Piece = {
  type: PieceType;
  owner: Owner;
  promoted?: boolean;
};
export type Board = (Piece | null)[][];
export type Hands = Record<Owner, Record<PieceType, number>>;
export type Move = {
  from?: { r: number; c: number };
  to: { r: number; c: number };
  drop?: PieceType;
  promotion: "none" | "optional" | "must";
};

export type GameSettings = {
  playerOwner: Owner;
  aiDepth: number;
  aiTimeMs: number;
  showHints: boolean;
  showEvaluationGraph: boolean;
  showFormationEffects: boolean;
  formationSound: boolean;
};

// All displayed scores use the same perspective: positive favors sente (b).
export type PositionEvaluation = {
  score: number;
  source: "engine" | "local";
};

export type EvaluationEntry = PositionEvaluation & { ply: number };

export type MoveQuality = "good" | "bad" | "neutral";
export type KifuEntry = {
  from?: Move["to"];
  captured?: PieceType;
  owner: Owner;
  pieceType: PieceType;
  promoted: boolean;
  isDrop: boolean;
  to: Move["to"];
  promotion: Move["promotion"];
  optionalPromotion: boolean;
  givesCheck: boolean;
  quality?: MoveQuality;
};

export type GameOutcome = {
  winner: Owner | null;
  reason: "checkmate" | "no-moves" | "repetition" | "perpetual-check";
};

export type GameResult = {
  winner: Owner | null;
  playerOwner: Owner;
  reason?: GameOutcome["reason"];
  evaluations: EvaluationEntry[];
  showEvaluationGraph: boolean;
  formations: FormationRecord[];
};

// IDs are defined in data/formations.json and validated against that catalog
// when loading saved records. Adding an entry needs no second ID registry.
export type FormationId = string;

export type FormationRecord = {
  id: FormationId;
  owner: Owner;
  ply: number;
};

export type FormationEvent = FormationRecord & { squares: Move["to"][] };
