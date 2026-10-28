"use client";

import { memo } from "react";
import Image from "next/image";
import type { Board, Move, Owner, Piece } from "../lib/types";
import { pieceLabel } from "../lib/constants";
import { squareText } from "../lib/notation";
import { boardPieceImage } from "../lib/pieceAssets";

type Props = {
  board: Board;
  selected: Move["to"] | null;
  legalTargets: Map<string, Move>;
  turn: Owner;
  lastMove: Move | null;
  playerOwner: Owner;
  hintMove?: Move | null;
  onSquareClick: (r: number, c: number) => void;
};

type SquareProps = {
  r: number;
  c: number;
  piece: Piece | null;
  selected: boolean;
  target: boolean;
  capture: boolean;
  lastMove: boolean;
  hintFrom: boolean;
  hintTo: boolean;
  playerOwner: Owner;
  onClick: Props["onSquareClick"];
};

// Piece identities survive immutable moves, so unaffected squares can skip rendering.
const BoardSquare = memo(function BoardSquare(props: SquareProps) {
  const {
    r,
    c,
    piece,
    selected,
    target,
    capture,
    lastMove,
    hintFrom,
    hintTo,
    playerOwner,
    onClick,
  } = props;
  const label = piece
    ? piece.promoted
      ? pieceLabel[piece.type].promoted
      : pieceLabel[piece.type].base
    : "";
  return (
    <button
      type="button"
      aria-label={`${squareText({ r, c })}${piece ? ` ${piece.owner === "b" ? "先手" : "後手"}の${label}` : " 空きマス"}${hintFrom ? " ヒントの移動元" : ""}${hintTo ? " ヒントの移動先" : ""}`}
      aria-pressed={selected}
      onClick={() => onClick(r, c)}
      className={`shogi-cell flex items-center justify-center text-lg font-semibold ${selected ? "is-selected" : ""} ${capture ? "is-capture" : target ? "is-target" : ""} ${lastMove ? "is-last-move" : ""} ${hintFrom ? "is-hint-from" : ""}`}
    >
      {piece && (
        <Image
          src={boardPieceImage(piece)}
          alt={label}
          className={`shogi-piece ${piece.owner !== playerOwner ? "is-opponent" : ""}`}
          width={128}
          height={128}
          sizes="64px"
          draggable={false}
        />
      )}
      {hintTo && <span className="shogi-hint-target" aria-hidden="true" />}
    </button>
  );
});

export default memo(function ShogiBoard({
  board,
  selected,
  legalTargets,
  turn,
  lastMove,
  playerOwner,
  hintMove,
  onSquareClick,
}: Props) {
  return (
    <div className="shogi-board text-zinc-900">
      <div className="shogi-grid">
        {board.map((row, r) =>
          row.map((piece, c) => {
            const target = legalTargets.has(`${r}-${c}`);
            return (
              <BoardSquare
                key={`${r}-${c}`}
                r={r}
                c={c}
                piece={piece}
                playerOwner={playerOwner}
                onClick={onSquareClick}
                selected={selected?.r === r && selected.c === c}
                target={target}
                capture={target && !!piece && piece.owner !== turn}
                lastMove={lastMove?.to.r === r && lastMove.to.c === c}
                hintFrom={hintMove?.from?.r === r && hintMove.from.c === c}
                hintTo={hintMove?.to.r === r && hintMove.to.c === c}
              />
            );
          }),
        )}
      </div>
    </div>
  );
});
