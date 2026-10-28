import type { Move } from "./types";

const square = (file: string, rank: string) => ({
  r: "abcdefghi".indexOf(rank),
  c: 9 - Number(file),
});

export const parseUsiMove = (value: string): Move | null => {
  const drop = value.match(/^([PLNSGBR])\*([1-9])([a-i])$/);
  if (drop)
    return {
      drop: drop[1] as NonNullable<Move["drop"]>,
      to: square(drop[2], drop[3]),
      promotion: "none",
    };
  const move = value.match(/^([1-9])([a-i])([1-9])([a-i])(\+)?$/);
  if (!move) return null;
  return {
    from: square(move[1], move[2]),
    to: square(move[3], move[4]),
    promotion: move[5] ? "must" : "none",
  };
};

export const parseUsiScore = (line: string): number | null => {
  if (
    !line.startsWith("info ") ||
    /\bmultipv\s+(?!1(?:\s|$))\d+/.test(line) ||
    /\b(?:lowerbound|upperbound)\b/.test(line)
  )
    return null;
  const match = line.match(/\bscore\s+(cp|mate)\s+([+-]?\d+|[+-])(?=\s|$)/);
  if (!match) return null;
  const value = Number(match[2]);
  if (match[1] === "cp")
    return Number.isFinite(value)
      ? Math.max(-89999, Math.min(89999, value))
      : null;
  const sign = match[2].startsWith("-") ? -1 : 1;
  const distance = Number.isFinite(value) ? Math.min(Math.abs(value), 9999) : 0;
  return sign * (100000 - distance);
};
