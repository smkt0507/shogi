"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import AiSettingsPanel from "./components/AiSettingsPanel";
import ControlsPanel from "./components/ControlsPanel";
import HandsPanel from "./components/HandsPanel";
import PromotionModal from "./components/PromotionModal";
import ShogiBoard from "./components/ShogiBoard";
import StatusPanel from "./components/StatusPanel";
import {
  type Board,
  type Hands,
  type Move,
  type Owner,
  type PieceType,
  applyMove,
  buildLegalMoves,
  canApplyPromotionOption,
  chooseAiMove,
  emptyHands,
  findKing,
  getLegalDropMoves,
  getLegalMovesForPiece,
  initialBoard,
  isInCheck,
} from "./lib/shogi";

const createInitialState = () => ({
  board: initialBoard(),
  hands: emptyHands(),
  turn: "b" as Owner,
  selected: null as { r: number; c: number } | null,
  selectedDrop: null as PieceType | null,
  legalMoves: [] as Move[],
  pendingPromotion: null as {
    move: Move;
    promote: boolean | null;
  } | null,
  winner: null as Owner | null,
});

export default function Home() {
  const [board, setBoard] = useState<Board>(() => initialBoard());
  const [hands, setHands] = useState<Hands>(() => emptyHands());
  const [turn, setTurn] = useState<Owner>("b");
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(
    null
  );
  const [selectedDrop, setSelectedDrop] = useState<PieceType | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{
    move: Move;
    promote: boolean | null;
  } | null>(null);
  const [winner, setWinner] = useState<Owner | null>(null);
  const [aiThinking, setAiThinking] = useState(false);
  const aiThinkingRef = useRef(false);
  const [aiDepth, setAiDepth] = useState(5);
  const [aiTimeMs, setAiTimeMs] = useState(1000);

  const checkStatus = useMemo(
    () => ({
      b: isInCheck(board, "b"),
      w: isInCheck(board, "w"),
    }),
    [board]
  );

  const resetGame = () => {
    const next = createInitialState();
    setBoard(next.board);
    setHands(next.hands);
    setTurn(next.turn);
    setSelected(next.selected);
    setSelectedDrop(next.selectedDrop);
    setLegalMoves(next.legalMoves);
    setPendingPromotion(next.pendingPromotion);
    setWinner(next.winner);
    setAiThinking(false);
    aiThinkingRef.current = false;
  };

  const legalTargets = useMemo(() => {
    const map = new Map<string, Move>();
    for (const move of legalMoves) {
      map.set(`${move.to.r}-${move.to.c}`, move);
    }
    return map;
  }, [legalMoves]);

  const handleSelectPiece = (r: number, c: number) => {
    const piece = board[r][c];
    if (!piece || piece.owner !== turn) return;
    setSelected({ r, c });
    setSelectedDrop(null);
    setLegalMoves(getLegalMovesForPiece(board, hands, turn, r, c));
  };

  const finalizeMove = useCallback(
    (move: Move, owner: Owner = turn) => {
      const { board: nextBoard, hands: nextHands } = applyMove(
        board,
        hands,
        move,
        owner
      );
      setBoard(nextBoard);
      setHands(nextHands);
      setSelected(null);
      setSelectedDrop(null);
      setLegalMoves([]);
      setPendingPromotion(null);
      const opponent: Owner = owner === "b" ? "w" : "b";
      const opponentKing = findKing(nextBoard, opponent);
      const opponentMoves = buildLegalMoves(nextBoard, nextHands, opponent);
      if (
        !opponentKing ||
        (opponentMoves.length === 0 && isInCheck(nextBoard, opponent))
      ) {
        setWinner(owner);
      } else {
        setTurn(opponent);
      }
    },
    [board, hands, turn]
  );

  const handleSquareClick = (r: number, c: number) => {
    if (winner || aiThinking || pendingPromotion) return;
    const piece = board[r][c];
    if (selectedDrop) {
      const key = `${r}-${c}`;
      const dropMove = legalTargets.get(key);
      if (dropMove && dropMove.drop) {
        finalizeMove(dropMove);
      }
      return;
    }
    if (selected) {
      const key = `${r}-${c}`;
      const move = legalTargets.get(key);
      if (move) {
        if (move.promotion === "optional") {
          const canPromote = canApplyPromotionOption(board, hands, turn, move, "must");
          const canDecline = canApplyPromotionOption(board, hands, turn, move, "none");
          if (canPromote && canDecline) {
            setPendingPromotion({ move, promote: null });
            return;
          }
          if (canPromote) {
            finalizeMove({ ...move, promotion: "must" });
            return;
          }
          if (canDecline) {
            finalizeMove({ ...move, promotion: "none" });
            return;
          }
          return;
        }
        finalizeMove(move);
        return;
      }
    }
    if (piece && piece.owner === turn) {
      handleSelectPiece(r, c);
    } else {
      setSelected(null);
      setLegalMoves([]);
    }
  };

  const handleDropSelect = (type: PieceType) => {
    if (winner || aiThinking || pendingPromotion || turn !== "b") return;
    if (hands[turn][type] <= 0) return;
    setSelected(null);
    setSelectedDrop(type);
    const drops = getLegalDropMoves(board, hands, turn).filter(
      (m) => m.drop === type
    );
    setLegalMoves(drops);
  };

  const resolvePromotion = (promote: boolean) => {
    if (!pendingPromotion) return;
    const promotion: Move["promotion"] = promote ? "must" : "none";
    const move: Move = {
      ...pendingPromotion.move,
      promotion,
    };
    finalizeMove(move);
  };

  useEffect(() => {
    if (winner || turn !== "w" || aiThinkingRef.current) return;
    aiThinkingRef.current = true;
    const timer = setTimeout(() => {
      setAiThinking(true);
      void (async () => {
        const move = await chooseAiMove(board, hands, aiDepth, aiTimeMs);
        if (move) {
          finalizeMove(move, "w");
        }
        aiThinkingRef.current = false;
        setAiThinking(false);
      })();
    }, 500);
    return () => {
      clearTimeout(timer);
      aiThinkingRef.current = false;
      setAiThinking(false);
    };
  }, [turn, board, hands, winner, aiDepth, aiTimeMs, finalizeMove]);

  return (
    <div className="min-h-screen bg-zinc-950 px-4 py-10 text-zinc-100">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <header className="flex flex-col gap-2">
          <h1 className="text-3xl font-semibold tracking-tight">将棋AI対戦</h1>
          <p className="text-sm text-zinc-300">
            先手（あなた）対 後手（AI）。駒を選んで移動先をクリック。
            持ち駒のドロップにも対応しています。
          </p>
        </header>

        <div className="flex flex-col gap-6 lg:flex-row">
          <div className="flex flex-1 flex-col gap-4">
            <div className="flex items-center justify-between rounded-2xl bg-zinc-900 px-5 py-3">
              <div className="text-sm">
                <span className="font-medium">後手（AI）</span>
                <span className="ml-3 text-zinc-400">
                  {aiThinking ? "AI思考中…" : "待機中"}
                </span>
              </div>
              <div className="text-xs text-zinc-400">
                {turn === "w" ? "AIの手番" : "あなたの手番"}
              </div>
            </div>

            <HandsPanel title="AIの持ち駒" hands={hands} owner="w" />

            <ShogiBoard
              board={board}
              selected={selected}
              legalTargets={legalTargets}
              turn={turn}
              onSquareClick={handleSquareClick}
            />

            <HandsPanel
              title="あなたの持ち駒"
              hands={hands}
              owner="b"
              selectable
              selectedDrop={selectedDrop}
              onSelect={handleDropSelect}
              disabled={turn !== "b"}
            />
          </div>

          <aside className="flex w-full flex-col gap-4 lg:w-72">
            <StatusPanel turn={turn} winner={winner} checkStatus={checkStatus} />
            <AiSettingsPanel
              aiDepth={aiDepth}
              aiTimeMs={aiTimeMs}
              aiThinking={aiThinking}
              onDepthChange={setAiDepth}
              onTimeChange={setAiTimeMs}
            />
            <ControlsPanel onReset={resetGame} />
          </aside>
        </div>

        {pendingPromotion && (
          <PromotionModal
            onPromote={() => resolvePromotion(true)}
            onDecline={() => resolvePromotion(false)}
          />
        )}
      </div>
    </div>
  );
}
