"use client";

import { useEffect, useId, useRef } from "react";

type Props = {
  onPromote: () => void;
  onDecline: () => void;
};

export default function PromotionModal({ onPromote, onDecline }: Props) {
  const titleId = useId();
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previous = document.activeElement;
    dialog.current?.querySelector("button")?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, []);
  return (
    <div
      ref={dialog}
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60"
      onKeyDown={(event) => {
        if (event.key === "Escape") onDecline();
        if (event.key !== "Tab") return;
        const buttons = dialog.current?.querySelectorAll("button");
        if (!buttons?.length) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
        if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }}
    >
      <div className="w-full max-w-sm rounded-2xl bg-zinc-900 p-6 text-center text-zinc-100">
        <div id={titleId} className="mb-3 text-lg font-semibold">
          成りますか？
        </div>
        <div className="mb-6 text-sm text-zinc-400">
          成ると駒が強化されます。
        </div>
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
