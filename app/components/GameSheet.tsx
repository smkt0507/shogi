"use client";

import { useEffect, useId, useRef } from "react";
import type { ReactNode } from "react";

type Props = {
  title: string;
  children: ReactNode;
  onClose: () => void;
};

export default function GameSheet({ title, children, onClose }: Props) {
  const dialog = useRef<HTMLDialogElement>(null);
  const titleId = useId();

  useEffect(() => {
    const element = dialog.current;
    if (!element) return;
    const previousFocus = document.activeElement;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    element.showModal();
    return () => {
      element.close();
      document.body.style.overflow = previousOverflow;
      if (previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  return (
    <dialog
      ref={dialog}
      className="game-sheet"
      aria-labelledby={titleId}
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
      onClick={(event) => {
        if (event.target !== event.currentTarget) return;
        const rect = event.currentTarget.getBoundingClientRect();
        if (
          event.clientX < rect.left ||
          event.clientX > rect.right ||
          event.clientY < rect.top ||
          event.clientY > rect.bottom
        )
          onClose();
      }}
    >
      <div className="game-sheet-handle" aria-hidden="true" />
      <header className="flex shrink-0 items-center justify-between gap-3 px-4 pb-3">
        <h2 id={titleId} className="font-semibold">
          {title}
        </h2>
        <button
          type="button"
          onClick={onClose}
          className="min-h-11 rounded-xl border border-zinc-700 px-4 text-sm text-zinc-200 hover:bg-zinc-800"
        >
          閉じる
        </button>
      </header>
      {children}
    </dialog>
  );
}
