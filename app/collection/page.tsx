"use client";

import Link from "next/link";
import { useState } from "react";
import {
  formations,
  detectableFormations,
  FORMATIONS_KEY,
  parseCollection,
  formationSquare,
  formationById,
} from "../lib/formations";
import type { Formation } from "../lib/formations";
import { useLocalStorageValue } from "../lib/useLocalStorageValue";
import { pieceLabel } from "../lib/constants";

function FormationDiagram({ formation }: { formation: Formation }) {
  return (
    <div
      className="formation-diagram"
      role="img"
      aria-label={`${formation.name}の代表配置（先手）。${formation.example.map(([type, file, rank]) => `${file}${rank}${pieceLabel[type].base}`).join("、")}`}
    >
      <div className="formation-diagram-files" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => (
          <span key={i}>{9 - i}</span>
        ))}
      </div>
      <div className="formation-diagram-grid" aria-hidden="true">
        {Array.from({ length: 81 }, (_, i) => {
          const piece = formation.example.find(([, file, rank]) => {
            const square = formationSquare(file, rank, "b");
            return square.r === Math.floor(i / 9) && square.c === i % 9;
          });
          return (
            <span
              key={i}
              className={piece ? "has-piece" : ""}
              data-rank={
                i % 9 === 8
                  ? "一二三四五六七八九"[Math.floor(i / 9)]
                  : undefined
              }
            >
              {piece ? pieceLabel[piece[0]].base : ""}
            </span>
          );
        })}
      </div>
    </div>
  );
}

const normalize = (value: string) =>
  value
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[ァ-ヶ]/g, (character) =>
      String.fromCharCode(character.charCodeAt(0) - 0x60),
    );
const selectClass =
  "min-w-0 rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-3 text-sm";
const families = [...new Set(formations.map((item) => item.family))];

export default function CollectionPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [discovery, setDiscovery] = useState("all");
  const [family, setFamily] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [limit, setLimit] = useState(24);
  const saved = useLocalStorageValue(FORMATIONS_KEY);
  const collected = parseCollection(saved ?? null);
  const ready = saved !== undefined;
  const search = normalize(query.trim());
  const visible = formations.filter((formation) => {
    const unlocked = collected.includes(formation.id);
    const supported = formation.recognition !== null;
    return (
      (category === "all" || formation.kind === category) &&
      (family === "all" || formation.family === family) &&
      (availability === "all" ||
        (availability === "supported" ? supported : !supported)) &&
      (discovery === "all" ||
        (ready &&
          (discovery === "found" ? unlocked : supported && !unlocked))) &&
      normalize(
        `${formation.name} ${formation.reading} ${formation.description} ${formation.family} ${formation.aliases.join(" ")}`,
      ).includes(search)
    );
  });
  const shown = visible.slice(0, limit);
  function showParent(id: string) {
    const parent = formationById(id);
    setQuery(parent.name);
    setCategory(parent.kind);
    setDiscovery("all");
    setFamily("all");
    setAvailability("all");
    setLimit(24);
  }
  return (
    <main className="min-h-screen bg-zinc-950 px-4 py-8 text-zinc-100 sm:py-12">
      <div className="mx-auto max-w-4xl">
        <Link
          href="/settings"
          className="text-sm text-zinc-400 hover:text-amber-200"
        >
          ← 対局設定へ
        </Link>
        <header className="collection-header">
          <p className="text-xs tracking-[0.3em] text-amber-200/65">
            一手ずつ、知る楽しみ。
          </p>
          <h1 className="mt-3 text-3xl font-bold sm:text-4xl">
            戦法・囲い図鑑
          </h1>
          <p className="mt-4 text-sm leading-7 text-zinc-400">
            戦法や囲いの系統・派生・別名を探そう。
            <br className="hidden sm:block" />
            自動判定に対応した形は、対局で使って集められます。
          </p>
          <div
            className="mt-6 flex flex-wrap items-baseline gap-x-6 gap-y-3 text-amber-100"
            aria-live="polite"
          >
            <div>
              <span className="text-4xl tabular-nums">{formations.length}</span>
              <span className="ml-2 text-xs text-zinc-500">収録項目</span>
            </div>
            <div>
              <span className="text-3xl tabular-nums">
                {detectableFormations.length}
              </span>
              <span className="ml-2 text-xs text-zinc-500">自動判定</span>
            </div>
            <div>
              <span className="text-3xl tabular-nums">
                {ready ? collected.length : "—"}
              </span>
              <span className="ml-2 text-xs text-zinc-500">
                / {detectableFormations.length} 発見
              </span>
            </div>
          </div>
          <div
            className="collection-progress"
            role="progressbar"
            aria-label="自動判定対応の発見数"
            aria-valuemin={0}
            aria-valuemax={detectableFormations.length}
            aria-valuenow={ready ? collected.length : 0}
          >
            <span
              style={{
                width: `${(collected.length / detectableFormations.length) * 100}%`,
              }}
            />
          </div>
        </header>
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <input
            type="search"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setLimit(24);
            }}
            aria-label="戦法・囲いを検索"
            placeholder="名前・読み方・別名で探す"
            className="col-span-2 min-w-0 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-sm outline-none focus:border-amber-300/60 sm:col-span-4"
          />
          <select
            value={category}
            onChange={(event) => {
              setCategory(event.target.value);
              setLimit(24);
            }}
            aria-label="種類で絞り込む"
            className={selectClass}
          >
            <option value="all">すべての種類（{formations.length}）</option>
            <option value="castle">
              囲い（{formations.filter((item) => item.kind === "castle").length}
              ）
            </option>
            <option value="opening">
              戦法（
              {formations.filter((item) => item.kind === "opening").length}）
            </option>
          </select>
          <select
            value={family}
            onChange={(event) => {
              setFamily(event.target.value);
              setLimit(24);
            }}
            aria-label="系統で絞り込む"
            className={selectClass}
          >
            <option value="all">すべての系統</option>
            {families.map((name) => (
              <option value={name} key={name}>
                {name}
              </option>
            ))}
          </select>
          <select
            value={availability}
            onChange={(event) => {
              setAvailability(event.target.value);
              setLimit(24);
            }}
            aria-label="自動判定の対応で絞り込む"
            className={selectClass}
          >
            <option value="all">すべての対応状況</option>
            <option value="supported">自動判定対応</option>
            <option value="reference">図鑑のみ</option>
          </select>
          <select
            value={discovery}
            onChange={(event) => {
              setDiscovery(event.target.value);
              setLimit(24);
            }}
            aria-label="発見状況で絞り込む"
            className={selectClass}
          >
            <option value="all">すべての発見状況</option>
            <option value="found">発見済み</option>
            <option value="unfound">未発見（判定対応）</option>
          </select>
        </div>
        <p
          className="mt-3 text-xs text-zinc-500"
          role="status"
          aria-live="polite"
        >
          {visible.length}項目中 {shown.length}件を表示
        </p>
        {visible.length === 0 && (
          <p className="mt-10 rounded-xl border border-zinc-800 p-6 text-center text-sm text-zinc-400">
            条件に合う戦法・囲いがありません。検索や絞り込みを変えてみてください。
          </p>
        )}
        {(["castle", "opening"] as const).map(
          (kind) =>
            shown.some((item) => item.kind === kind) && (
              <section
                key={kind}
                className="mt-10"
                aria-label={kind === "castle" ? "囲い" : "戦法"}
              >
                <h2 className="mb-4 flex items-center gap-3 text-lg font-semibold">
                  <span className="text-amber-200/70" aria-hidden="true">
                    {kind === "castle" ? "守" : "攻"}
                  </span>
                  {kind === "castle" ? "玉を守る、囲い" : "攻めを描く、戦法"}
                </h2>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {shown
                    .filter((item) => item.kind === kind)
                    .map((formation) => {
                      const unlocked = collected.includes(formation.id);
                      const supported = formation.recognition !== null;
                      return (
                        <article
                          key={formation.id}
                          className={`collection-card ${unlocked ? "is-unlocked" : ""}`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] tracking-widest text-zinc-500">
                              {kind === "castle" ? "囲い" : "戦法"}
                            </span>
                            <span
                              className={`collection-badge ${unlocked ? "is-unlocked" : ""}`}
                            >
                              {!supported
                                ? "図鑑のみ"
                                : !ready
                                  ? "読み込み中"
                                  : unlocked
                                    ? "発見済み"
                                    : "未発見"}
                            </span>
                          </div>
                          <p className="mt-4 text-[11px] text-amber-200/50">
                            {formation.family}
                            {supported ? " · 自動判定対応" : ""}
                          </p>
                          {formation.reading && (
                            <p className="mt-4 text-[11px] tracking-widest text-zinc-500">
                              {formation.reading}
                            </p>
                          )}
                          <h3 className="mt-2 text-2xl font-bold">
                            {formation.name}
                          </h3>
                          {formation.aliases.length > 0 && (
                            <p className="mt-3 text-xs leading-6 text-zinc-500">
                              別名：{formation.aliases.join("、")}
                            </p>
                          )}
                          {formation.parentId && (
                            <button
                              type="button"
                              onClick={() => showParent(formation.parentId!)}
                              className="mt-3 text-xs text-amber-200/70 underline underline-offset-4"
                            >
                              系統の親：{formationById(formation.parentId).name}{" "}
                              →
                            </button>
                          )}
                          {formation.example.length > 0 && (
                            <FormationDiagram formation={formation} />
                          )}
                          <p className="mt-3 text-xs leading-6 text-zinc-400">
                            {formation.description ||
                              "名称・系統の参考項目。対局での自動判定は未対応です。"}
                          </p>
                          {!supported && (
                            <a
                              href={formation.sources[0]}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="mt-4 inline-block text-xs text-zinc-500 underline underline-offset-4"
                            >
                              参照資料を読む ↗
                            </a>
                          )}
                        </article>
                      );
                    })}
                </div>
              </section>
            ),
        )}
        {shown.length < visible.length && (
          <button
            type="button"
            onClick={() => setLimit((count) => count + 48)}
            className="mt-8 w-full rounded-xl border border-amber-200/30 bg-amber-950/15 p-3 text-sm text-amber-100 hover:bg-amber-950/30"
          >
            もっと表示（残り{visible.length - shown.length}件）
          </button>
        )}
        <p className="mt-8 text-xs leading-6 text-zinc-500">
          収録項目は基本形・派生・旧定跡・駒落ちを含み、同じ名前でも囲いと戦法の役割が異なる場合があります。確認できた別名は同じ項目にまとめています。
          <br />
          「図鑑のみ」は名称と系統の資料です。配置や判定条件を確認できた項目から、自動判定へ追加しています。
          <br />
          図は代表配置から駒を抜き出したもので、すべての変化形を網羅するものではありません。戦法は原則として自分の30手目まで（早石田は8手目まで）、囲いは対局全体で判定します。発見はこのブラウザに保存されます。
        </p>
      </div>
    </main>
  );
}
