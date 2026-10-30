import type { EvaluationEntry, GameResult, GameSettings } from "./types";
import { isOwner, isRecord } from "./validation";
import { parseFormationRecords } from "./formations";

export const SETTINGS_KEY = "shogi-settings";
export const RESULT_KEY = "shogi-result";
export const depthOptions = [2, 3, 4, 5] as const;
export const timeOptions = [400, 800, 1200, 2000] as const;

const savedNumber = (
  value: unknown,
  options: readonly number[],
  fallback: number,
) => (typeof value === "number" && options.includes(value) ? value : fallback);

export const defaultSettings: GameSettings = {
  playerOwner: "b",
  aiDepth: 2,
  aiTimeMs: 400,
  showHints: false,
  showEvaluationGraph: false,
  showFormationEffects: true,
  formationSound: false,
};

export const parseSettings = (saved: string | null): GameSettings | null => {
  if (!saved) return null;
  try {
    const parsed: unknown = JSON.parse(saved);
    if (!isRecord(parsed)) return null;
    return {
      playerOwner: parsed.playerOwner === "w" ? "w" : "b",
      aiDepth: savedNumber(
        parsed.aiDepth,
        depthOptions,
        defaultSettings.aiDepth,
      ),
      aiTimeMs: savedNumber(
        parsed.aiTimeMs,
        timeOptions,
        defaultSettings.aiTimeMs,
      ),
      showHints: parsed.showHints === true,
      showEvaluationGraph: parsed.showEvaluationGraph === true,
      showFormationEffects: parsed.showFormationEffects !== false,
      formationSound: parsed.formationSound === true,
    };
  } catch {
    return null;
  }
};

export const parseResult = (saved: string | null): GameResult | null => {
  if (!saved || saved.length > 1_000_000) return null;
  try {
    const parsed: unknown = JSON.parse(saved);
    if (
      !isRecord(parsed) ||
      (!isOwner(parsed.winner) && parsed.winner !== null) ||
      !isOwner(parsed.playerOwner)
    )
      return null;
    const evaluations: EvaluationEntry[] = [];
    // Retain a contiguous prefix so every slider position refers to a real ply.
    if (Array.isArray(parsed.evaluations)) {
      for (const entry of parsed.evaluations) {
        if (
          !isRecord(entry) ||
          entry.ply !== evaluations.length ||
          typeof entry.score !== "number" ||
          !Number.isFinite(entry.score) ||
          Math.abs(entry.score) > 100000 ||
          (entry.source !== "local" && entry.source !== "engine")
        )
          break;
        evaluations.push({
          ply: evaluations.length,
          score: entry.score,
          source: entry.source,
        });
      }
    }
    const reasons = ["checkmate", "no-moves", "repetition", "perpetual-check"];
    if (parsed.winner === null && parsed.reason !== "repetition") return null;
    return {
      winner: parsed.winner,
      playerOwner: parsed.playerOwner,
      evaluations,
      reason: reasons.includes(parsed.reason as string)
        ? (parsed.reason as GameResult["reason"])
        : undefined,
      showEvaluationGraph: parsed.showEvaluationGraph === true,
      formations: parseFormationRecords(parsed.formations),
    };
  } catch {
    return null;
  }
};
