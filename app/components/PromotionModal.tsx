"use client";

type Props = {
  onPromote: () => void;
  onDecline: () => void;
};

export default function PromotionModal({ onPromote, onDecline }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-6 text-center text-zinc-100">
        <div className="mb-3 text-lg font-semibold">成りますか？</div>
        <div className="mb-6 text-sm text-zinc-400">成ると駒が強化されます。</div>
        <div className="flex gap-3">
          <button
            onClick={onPromote}
            className="flex-1 rounded-xl bg-emerald-500 px-4 py-2 text-sm font-semibold text-zinc-900"
          >
            成る
          </button>
          <button
            onClick={onDecline}
            className="flex-1 rounded-xl bg-zinc-700 px-4 py-2 text-sm font-semibold text-zinc-100"
          >
            成らない
          </button>
        </div>
      </div>
    </div>
  );
}
