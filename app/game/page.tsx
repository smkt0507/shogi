"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ControlsPanel from "../components/ControlsPanel";
import HandsPanel from "../components/HandsPanel";
import KifuPanel from "../components/KifuPanel";
import PromotionModal from "../components/PromotionModal";
import ShogiBoard from "../components/ShogiBoard";
import StatusPanel from "../components/StatusPanel";
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
  evaluatePosition,
  emptyHands,
  findKing,
  getLegalDropMoves,
  getLegalMovesForPiece,
  initialBoard,
  isInCheck,
} from "../lib/shogi";

const SETTINGS_KEY = "shogi-settings";
const RESULT_KEY = "shogi-result";

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
  lastMove: null as Move | null,
  moveHistory: [] as {
    owner: Owner;
    pieceType: PieceType;
    promoted: boolean;
    isDrop: boolean;
    to: { r: number; c: number };
    promotion: Move["promotion"];
    optionalPromotion: boolean;
    quality?: "good" | "bad" | "neutral";
  }[],
});

export default function GamePage() {
  const router = useRouter();
  const [board, setBoard] = useState<Board>(() => initialBoard());
  const [hands, setHands] = useState<Hands>(() => emptyHands());
  const [turn, setTurn] = useState<Owner>("b");
  const [selected, setSelected] = useState<{ r: number; c: number } | null>(
    null,
  );
  const [selectedDrop, setSelectedDrop] = useState<PieceType | null>(null);
  const [legalMoves, setLegalMoves] = useState<Move[]>([]);
  const [pendingPromotion, setPendingPromotion] = useState<{
    move: Move;
    promote: boolean | null;
  } | null>(null);
  const [winner, setWinner] = useState<Owner | null>(null);
  const [lastMove, setLastMove] = useState<Move | null>(null);
  const [moveHistory, setMoveHistory] = useState<
    {
      owner: Owner;
      pieceType: PieceType;
      promoted: boolean;
      isDrop: boolean;
      to: { r: number; c: number };
      promotion: Move["promotion"];
      optionalPromotion: boolean;
      quality?: "good" | "bad" | "neutral";
    }[]
  >([]);
  const [aiThinking, setAiThinking] = useState(false);
  const aiThinkingRef = useRef(false);
  const evalRef = useRef<number | null>(null);
  const initialSettings = (() => {
    if (typeof window === "undefined") return null;
    const saved = localStorage.getItem(SETTINGS_KEY);
    if (!saved) return null;
    try {
      const parsed = JSON.parse(saved) as {
        playerOwner?: Owner;
        aiDepth?: number;
        aiTimeMs?: number;
      };
      return {
        playerOwner:
          parsed.playerOwner === "b" || parsed.playerOwner === "w"
            ? parsed.playerOwner
            : undefined,
        aiDepth:
          typeof parsed.aiDepth === "number" ? parsed.aiDepth : undefined,
        aiTimeMs:
          typeof parsed.aiTimeMs === "number" ? parsed.aiTimeMs : undefined,
      };
    } catch {
      return null;
    }
  })();
  const [aiDepth] = useState(initialSettings?.aiDepth ?? 5);
  const [aiTimeMs] = useState(initialSettings?.aiTimeMs ?? 1000);
  const [playerOwner] = useState<Owner>(initialSettings?.playerOwner ?? "b");
  const [settingsLoaded] = useState(Boolean(initialSettings));
  const aiOwner: Owner = playerOwner === "b" ? "w" : "b";

  useEffect(() => {
    if (!settingsLoaded) {
      router.replace("/settings");
      return;
    }
    localStorage.removeItem(RESULT_KEY);
  }, [router, settingsLoaded]);

  useEffect(() => {
    if (!settingsLoaded) return;
    if (evalRef.current !== null) return;
    const evalDepth = Math.max(aiDepth + 2, 8);
    const evalTimeMs = Math.max(aiTimeMs * 2, 2000);
    void (async () => {
      const score = await evaluatePosition(
        board,
        hands,
        turn,
        evalDepth,
        evalTimeMs,
      );
      evalRef.current = score;
    })();
  }, [settingsLoaded, aiDepth, aiTimeMs, board, hands, turn]);

  const checkStatus = useMemo(
    () => ({
      b: isInCheck(board, "b"),
      w: isInCheck(board, "w"),
    }),
    [board],
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
    setLastMove(next.lastMove);
    setMoveHistory(next.moveHistory);
    setAiThinking(false);
    aiThinkingRef.current = false;
    evalRef.current = null;
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
        owner,
      );
      setBoard(nextBoard);
      setHands(nextHands);
      setSelected(null);
      setSelectedDrop(null);
      setLegalMoves([]);
      setPendingPromotion(null);
      setLastMove(move);
      const movedPiece = move.drop
        ? null
        : board[move.from?.r ?? -1]?.[move.from?.c ?? -1];
      const pieceType = move.drop ?? movedPiece?.type;
      const moveIndex = pieceType ? moveHistory.length : -1;
      if (pieceType) {
        const promoted =
          move.promotion === "must" ? true : !!movedPiece?.promoted;
        const optionalPromotion = !move.drop && move.promotion === "optional";
        setMoveHistory((prev) => [
          ...prev,
          {
            owner,
            pieceType,
            promoted,
            isDrop: !!move.drop,
            to: move.to,
            promotion: move.promotion,
            optionalPromotion,
            quality: "neutral" as const,
          },
        ]);
      }
      const opponent: Owner = owner === "b" ? "w" : "b";
      const opponentKing = findKing(nextBoard, opponent);
      const opponentMoves = buildLegalMoves(nextBoard, nextHands, opponent);
      const scoreBefore = evalRef.current;
      if (moveIndex >= 0) {
        const evalDepth = Math.max(aiDepth + 2, 8);
        const evalTimeMs = Math.max(aiTimeMs * 2, 2000);
        void (async () => {
          const scoreAfter = await evaluatePosition(
            nextBoard,
            nextHands,
            opponent,
            evalDepth,
            evalTimeMs,
          );
          evalRef.current = scoreAfter;
          if (scoreBefore === null) return;
          const scoreAfterForMover = -scoreAfter;
          const delta = scoreAfterForMover - scoreBefore;
          const quality =
            delta >= 80 ? "good" : delta <= -80 ? "bad" : "neutral";
          setMoveHistory((prev) => {
            if (!prev[moveIndex]) return prev;
            const next = [...prev];
            next[moveIndex] = { ...next[moveIndex], quality };
            return next;
          });
        })();
      }
      if (
        !opponentKing ||
        (opponentMoves.length === 0 && isInCheck(nextBoard, opponent))
      ) {
        setWinner(owner);
        localStorage.setItem(
          RESULT_KEY,
          JSON.stringify({ winner: owner, playerOwner }),
        );
        router.push("/result");
      } else {
        setTurn(opponent);
      }
    },
    [board, hands, turn, playerOwner, router, aiDepth, aiTimeMs],
  );

  const handleSquareClick = (r: number, c: number) => {
    if (winner || aiThinking || pendingPromotion) return;
    if (turn !== playerOwner) return;
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
          const canPromote = canApplyPromotionOption(
            board,
            hands,
            turn,
            move,
            "must",
          );
          const canDecline = canApplyPromotionOption(
            board,
            hands,
            turn,
            move,
            "none",
          );
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
    if (winner || aiThinking || pendingPromotion || turn !== playerOwner)
      return;
    if (hands[turn][type] <= 0) return;
    if (selectedDrop === type) {
      setSelectedDrop(null);
      setLegalMoves([]);
      return;
    }
    setSelected(null);
    setSelectedDrop(type);
    const drops = getLegalDropMoves(board, hands, turn).filter(
      (m) => m.drop === type,
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
    if (!settingsLoaded) return;
    if (winner || turn !== aiOwner || aiThinkingRef.current) return;
    aiThinkingRef.current = true;
    const timer = setTimeout(() => {
      setAiThinking(true);
      void (async () => {
        const move = await chooseAiMove(board, hands, aiDepth, aiTimeMs);
        if (move) {
          finalizeMove(move, aiOwner);
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
  }, [
    turn,
    board,
    hands,
    winner,
    aiDepth,
    aiTimeMs,
    finalizeMove,
    aiOwner,
    settingsLoaded,
  ]);

  const playerLabel = playerOwner === "b" ? "先手（あなた）" : "後手（あなた）";

  const handleBackToSettings = () => {
    resetGame();
    router.push("/settings");
  };

  if (!settingsLoaded) {
    return null;
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col items-center justify-center gap-6 px-4 py-6 lg:flex-row">
        <div className="hidden lg:block lg:w-56" aria-hidden />

        <div className="flex w-full max-w-[860px] flex-col items-center gap-4">
          <div className="flex w-full flex-col items-center gap-4">
            <HandsPanel title="AIの持ち駒" hands={hands} owner={aiOwner} />

            <div className="relative">
              <ShogiBoard
                board={board}
                selected={selected}
                legalTargets={legalTargets}
                turn={turn}
                lastMove={lastMove}
                playerOwner={playerOwner}
                onSquareClick={handleSquareClick}
              />
              {aiThinking && (
                <div className="absolute inset-0 z-20 flex items-center justify-center">
                  <div className="rounded-2xl bg-black/70 px-6 py-4 text-sm text-zinc-100 shadow-xl">
                    <div className="text-base font-semibold">AI思考中…</div>
                    <div className="mt-1 text-xs text-zinc-300">
                      しばらくお待ちください
                    </div>
                  </div>
                </div>
              )}
            </div>
            <HandsPanel
              title={playerLabel}
              hands={hands}
              owner={playerOwner}
              selectable
              selectedDrop={selectedDrop}
              onSelect={handleDropSelect}
              disabled={turn !== playerOwner}
            />
          </div>
        </div>

        <aside className="flex w-full flex-col gap-4 lg:w-72">
          <StatusPanel turn={turn} winner={winner} checkStatus={checkStatus} />
          <KifuPanel moves={moveHistory} heightClassName="h-64" />
          <ControlsPanel
            onReset={resetGame}
            onBackToSettings={handleBackToSettings}
          />
        </aside>

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
