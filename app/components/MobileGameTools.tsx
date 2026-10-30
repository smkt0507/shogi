"use client";

import { useCallback, useId, useState } from "react";
import type { ReactNode } from "react";
import ControlsPanel from "./ControlsPanel";
import GameSheet from "./GameSheet";

type Tool = "hint" | "evaluation" | "kifu" | "formations" | "menu";
type Props = {
  hint: ReactNode;
  evaluation: ReactNode;
  kifu: ReactNode;
  status: ReactNode;
  formations: ReactNode;
  onReset: () => void;
  onBackToSettings: () => void;
};

function ToolIcon({ tool }: { tool: Tool }) {
  const paths: Record<Tool, string> = {
    hint: "M9 18h6m-5 3h4M8.1 14a6 6 0 1 1 7.8 0L15 16H9l-.9-2ZM12 1v2M3 5l1.5 1.5M21 5l-1.5 1.5",
    evaluation: "M4 3v17h17M7 14l4-5 4 3 5-7",
    kifu: "M6 3h12v18H6zM9 7h6M9 11h6M9 15h4",
    formations:
      "M4 4h6l2 2 2-2h6v16h-6l-2 2-2-2H4zM12 6v16M7 8h2M15 8h2M7 12h2M15 12h2",
    menu: "M4 6h16M4 12h16M4 18h16",
  };
  return (
    <svg
      viewBox="0 0 24 24"
      width="22"
      height="22"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={paths[tool]} />
    </svg>
  );
}

export default function MobileGameTools({
  hint,
  evaluation,
  kifu,
  status,
  formations,
  onReset,
  onBackToSettings,
}: Props) {
  const [active, setActive] = useState<Tool | null>(null);
  const id = useId();
  const close = useCallback(() => setActive(null), []);
  const tools: {
    id: Tool;
    label: string;
    title: string;
    content: ReactNode;
  }[] = [
    ...(hint
      ? [
          {
            id: "hint" as const,
            label: "ヒント",
            title: "次の一手ヒント",
            content: hint,
          },
        ]
      : []),
    ...(evaluation
      ? [
          {
            id: "evaluation" as const,
            label: "評価",
            title: "評価値グラフ",
            content: evaluation,
          },
        ]
      : []),
    { id: "kifu", label: "棋譜", title: "棋譜", content: kifu },
    {
      id: "formations",
      label: "戦法",
      title: "この対局の戦法・囲い",
      content: formations,
    },
    {
      id: "menu",
      label: "メニュー",
      title: "対局メニュー",
      content: (
        <div className="space-y-3">
          {status}
          <ControlsPanel
            onReset={() => {
              close();
              onReset();
            }}
            onBackToSettings={() => {
              close();
              onBackToSettings();
            }}
          />
        </div>
      ),
    },
  ];
  const selected = tools.find((tool) => tool.id === active);

  return (
    <>
      <nav className="game-mobile-tools" aria-label="対局ツール">
        {tools.map((tool) => (
          <button
            key={tool.id}
            type="button"
            className="game-tool-button"
            aria-haspopup="dialog"
            aria-expanded={active === tool.id}
            onClick={() => setActive(tool.id)}
          >
            <ToolIcon tool={tool.id} />
            <span>{tool.label}</span>
          </button>
        ))}
      </nav>
      {selected && (
        <GameSheet title={selected.title} onClose={close}>
          <div
            className="game-sheet-tabs"
            role="tablist"
            aria-label="対局情報の切り替え"
          >
            {tools.map((tool, index) => (
              <button
                key={tool.id}
                id={`${id}-${tool.id}-tab`}
                type="button"
                role="tab"
                aria-selected={active === tool.id}
                aria-controls={`${id}-panel`}
                tabIndex={active === tool.id ? 0 : -1}
                onClick={() => setActive(tool.id)}
                onKeyDown={(event) => {
                  const next =
                    event.key === "ArrowRight"
                      ? (index + 1) % tools.length
                      : event.key === "ArrowLeft"
                        ? (index - 1 + tools.length) % tools.length
                        : event.key === "Home"
                          ? 0
                          : event.key === "End"
                            ? tools.length - 1
                            : null;
                  if (next === null) return;
                  event.preventDefault();
                  setActive(tools[next].id);
                  document
                    .getElementById(`${id}-${tools[next].id}-tab`)
                    ?.focus();
                }}
              >
                {tool.label}
              </button>
            ))}
          </div>
          <div
            id={`${id}-panel`}
            role="tabpanel"
            aria-labelledby={`${id}-${selected.id}-tab`}
            className="game-sheet-body"
            tabIndex={0}
            key={selected.id}
          >
            {selected.content}
          </div>
        </GameSheet>
      )}
    </>
  );
}
