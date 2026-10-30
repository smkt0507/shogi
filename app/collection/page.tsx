"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { RefObject } from "react";
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
import "./collection.css";

function FormationDiagram({ formation }: { formation: Formation }) {
  return (
    <div className="formation-diagram" role="img" aria-label={`${formation.name}の代表配置（先手）。${formation.example.map(([type, file, rank]) => `${file}${rank}${pieceLabel[type].base}`).join("、")}`}>
      <div className="formation-diagram-files" aria-hidden="true">
        {Array.from({ length: 9 }, (_, i) => <span key={i}>{9 - i}</span>)}
      </div>
      <div className="formation-diagram-grid" aria-hidden="true">
        {Array.from({ length: 81 }, (_, i) => {
          const piece = formation.example.find(([, file, rank]) => {
            const square = formationSquare(file, rank, "b");
            return square.r === Math.floor(i / 9) && square.c === i % 9;
          });
          return <span key={i} className={piece ? "has-piece" : ""} data-rank={i % 9 === 8 ? "一二三四五六七八九"[Math.floor(i / 9)] : undefined}>{piece ? pieceLabel[piece[0]].base : ""}</span>;
        })}
      </div>
    </div>
  );
}

const normalize = (value: string) => value.normalize("NFKC").toLowerCase().replace(/[ァ-ヶ]/g, (character) => String.fromCharCode(character.charCodeAt(0) - 0x60));
const families = [...new Set(formations.map((item) => item.family))];
const catalogueNotes = "戦法・囲いの系統、派生、旧定跡、奇襲、駒落ちを収録しています。同じ名前でも、囲いと戦法で役割が異なる場合があります。確認できた別名は同じ項目にまとめています。\n\n「自動判定対応」は対局中に成立を検出できる項目です。「図鑑のみ」は名称と系統の参考資料で、発見数には含みません。\n\n配置図は代表形の一部の駒を示し、すべての変化形を網羅するものではありません。図と判定条件はそれぞれの項目の説明を参照してください。\n\n戦法の判定は原則として自分の30手目までです。一部の早い仕掛けには、さらに短い期限や先手・後手の指定があります。囲いは対局全体で判定します。\n\n発見はこのブラウザーに保存します。異なるブラウザーやデバイスとは自動同期されません。";

function usePanelSize(ref: RefObject<HTMLDivElement | null>, active = true) {
  const [size, setSize] = useState({ width: 300, height: 240 });
  useEffect(() => {
    const element = ref.current;
    if (!element || !active) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      setSize((previous) => previous.width === width && previous.height === height ? previous : { width, height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref, active]);
  return size;
}

// Measure real text in the available panel. The whole description remains
// reachable by pages, including large text, rather than being clipped to fit.
function TextPages({ text, label }: { text: string; label: string }) {
  const frame = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLParagraphElement>(null);
  const size = usePanelSize(frame);
  const [pages, setPages] = useState<string[]>([text]);
  const [requestedPage, setRequestedPage] = useState(0);
  useEffect(() => {
    let active = true;
    let animationFrame = 0;
    const measure = () => {
      animationFrame = requestAnimationFrame(() => {
        const element = probe.current;
        if (!active || !element || !frame.current) return;
        const height = frame.current.clientHeight;
        if (height < 20 || frame.current.clientWidth < 20) return;
        const characters = Array.from(text);
        const result: string[] = [];
        let start = 0;
        while (start < characters.length) {
          let low = 1;
          let high = characters.length - start;
          let fit = 1;
          while (low <= high) {
            const length = Math.floor((low + high) / 2);
            element.textContent = characters.slice(start, start + length).join("");
            if (element.scrollHeight <= height) { fit = length; low = length + 1; }
            else high = length - 1;
          }
          result.push(characters.slice(start, start + fit).join(""));
          start += fit;
        }
        element.textContent = "";
        setPages(result.length ? result : [""]);
      });
    };
    measure();
    void document.fonts.ready.then(() => { if (active) measure(); });
    return () => { active = false; cancelAnimationFrame(animationFrame); };
  }, [text, size.width, size.height]);
  const page = Math.min(requestedPage, pages.length - 1);
  return (
    <div className="atlas-text-pages" aria-label={label}>
      <div className="atlas-text-frame" ref={frame}>
        <p className="atlas-prose">{pages[page]}</p>
        <p className="atlas-prose atlas-text-probe" ref={probe} aria-hidden="true" />
      </div>
      <nav className="atlas-pager atlas-text-pager" aria-label={`${label}のページ`}>
        <button type="button" disabled={page === 0} onClick={() => setRequestedPage(page - 1)}>← 前へ</button>
        <span role="status" aria-live="polite">{page + 1} / {pages.length}</span>
        <button type="button" disabled={page + 1 >= pages.length} onClick={() => setRequestedPage(page + 1)}>次へ →</button>
      </nav>
    </div>
  );
}

function Sources({ formation }: { formation: Formation }) {
  const frame = useRef<HTMLDivElement>(null);
  const size = usePanelSize(frame);
  const perPage = Math.max(1, Math.floor(size.height / 58));
  const [requestedPage, setRequestedPage] = useState(0);
  const pageCount = Math.max(1, Math.ceil(formation.sources.length / perPage));
  const page = Math.min(requestedPage, pageCount - 1);
  return <div className="atlas-text-pages">
    <div className="atlas-sources" ref={frame}>
      {formation.sources.slice(page * perPage, (page + 1) * perPage).map((source, index) => <a href={source} key={source} target="_blank" rel="noopener noreferrer" aria-label={`参照資料 ${page * perPage + index + 1}：${source}（新しいタブ）`}>
        <span>参照資料 {page * perPage + index + 1}</span><span>{new URL(source).hostname} ↗</span>
      </a>)}
    </div>
    <nav className="atlas-pager atlas-text-pager" aria-label="資料のページ">
      <button type="button" disabled={page === 0} onClick={() => setRequestedPage(page - 1)}>← 前へ</button>
      <span role="status" aria-live="polite">{page + 1} / {pageCount}</span>
      <button type="button" disabled={page + 1 >= pageCount} onClick={() => setRequestedPage(page + 1)}>次へ →</button>
    </nav>
  </div>;
}

type View = "list" | "filters" | "detail" | "about";
type DetailTab = "description" | "diagram" | "sources";

export default function CollectionPage() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [discovery, setDiscovery] = useState("all");
  const [family, setFamily] = useState("all");
  const [availability, setAvailability] = useState("all");
  const [requestedPage, setRequestedPage] = useState(0);
  const [view, setView] = useState<View>("list");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>("description");
  const listFrame = useRef<HTMLDivElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const searchInput = useRef<HTMLInputElement>(null);
  const listButtons = useRef(new Map<string, HTMLButtonElement>());
  const previousView = useRef<View>("list");
  const lastOpenedId = useRef<string | null>(null);
  const size = usePanelSize(listFrame, view === "list");
  const saved = useLocalStorageValue(FORMATIONS_KEY);
  const collected = parseCollection(saved ?? null);
  const ready = saved !== undefined;
  const search = normalize(query.trim());
  const visible = formations.filter((formation) => {
    const unlocked = collected.includes(formation.id);
    const supported = formation.recognition !== null;
    return (category === "all" || formation.kind === category) &&
      (family === "all" || formation.family === family) &&
      (availability === "all" || (availability === "supported" ? supported : !supported)) &&
      (discovery === "all" || (ready && (discovery === "found" ? unlocked : supported && !unlocked))) &&
      normalize(`${formation.name} ${formation.reading} ${formation.description} ${formation.family} ${formation.aliases.join(" ")}`).includes(search);
  });
  const columns = size.width >= 900 ? 3 : size.width >= 560 ? 2 : 1;
  const rowHeight = columns > 1 ? 112 : 94;
  const rows = Math.max(1, Math.floor((size.height + 8) / (rowHeight + 8)));
  const perPage = columns * rows;
  const pageCount = Math.max(1, Math.ceil(visible.length / perPage));
  const page = Math.min(requestedPage, pageCount - 1);
  const shown = visible.slice(page * perPage, (page + 1) * perPage);
  const selected = selectedId ? formationById(selectedId) : null;
  const activeFilters = [category, family, availability, discovery].filter((value) => value !== "all").length;

  useEffect(() => {
    if (view === "list" && previousView.current !== "list") {
      const button = lastOpenedId.current && listButtons.current.get(lastOpenedId.current);
      (button || searchInput.current)?.focus({ preventScroll: true });
    } else if (view !== "list") heading.current?.focus({ preventScroll: true });
    previousView.current = view;
  }, [view, selectedId]);

  function openFormation(id: string) {
    lastOpenedId.current = id;
    setSelectedId(id);
    setDetailTab("description");
    setView("detail");
  }
  const resetPage = () => setRequestedPage(0);
  const description = selected ? [
    selected.reading && `読み方：${selected.reading}`,
    `${selected.kind === "castle" ? "囲い" : "戦法"} · ${selected.family}`,
    selected.aliases.length > 0 && `別名：${selected.aliases.join("、")}`,
    selected.description || "名称・系統の参考項目です。対局中の自動判定にはまだ対応していません。",
    selected.recognition ? `自動判定対応。${selected.recognition.owner === "b" ? "先手で成立した場合が対象です。" : selected.recognition.owner === "w" ? "後手で成立した場合が対象です。" : "先手・後手の両方に対応します。"}${selected.recognition.maxOwnMoves ? `自分の${selected.recognition.maxOwnMoves}手目まで判定します。` : "対局全体で判定します。"}` : "図鑑のみ。発見数の対象外です。",
  ].filter(Boolean).join("\n\n") : "";

  return (
    <main className="atlas-screen">
      <div className="atlas-shell">
        <header className="atlas-topbar">
          {view === "list" ? <Link href="/settings" className="atlas-back">← 設定</Link> : <button type="button" className="atlas-back" onClick={() => setView("list")}>← 一覧</button>}
          <h1>戦法・囲い図鑑</h1>
          <button type="button" className="atlas-help" aria-label="図鑑について" onClick={() => setView("about")}>？</button>
        </header>
        <div className="atlas-stats" aria-label="図鑑の収録・発見状況">
          <span><strong>{formations.length}</strong> 収録</span>
          <span><strong>{detectableFormations.length}</strong> 自動判定</span>
          <span><strong>{ready ? collected.length : "—"}</strong> / {detectableFormations.length} 発見</span>
        </div>
        <div className="atlas-progress" role="progressbar" aria-label="自動判定対応の発見数" aria-valuemin={0} aria-valuemax={detectableFormations.length} aria-valuenow={ready ? collected.length : 0}>
          <span style={{ width: `${collected.length / Math.max(detectableFormations.length, 1) * 100}%` }} />
        </div>

        {view === "list" && <>
          <div className="atlas-search">
            <input type="search" ref={searchInput} enterKeyHint="search" onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} value={query} onChange={(event) => { setQuery(event.target.value); resetPage(); }} aria-label="戦法・囲いを検索" placeholder="名前・読み方・別名で探す" />
            <button type="button" onClick={() => setView("filters")}>絞り込み{activeFilters > 0 ? ` ${activeFilters}` : ""}</button>
          </div>
          <div className="atlas-list-frame" ref={listFrame} onKeyDown={(event) => {
            if (event.key === "PageDown" || event.key === "PageUp") {
              event.preventDefault();
              setRequestedPage(Math.max(0, Math.min(pageCount - 1, page + (event.key === "PageDown" ? 1 : -1))));
            }
          }}>
            {visible.length === 0 ? <div className="atlas-empty"><p>条件に合う項目がありません。</p><button type="button" onClick={() => { setQuery(""); setCategory("all"); setFamily("all"); setAvailability("all"); setDiscovery("all"); resetPage(); }}>検索条件をリセット</button></div> :
              <div className="atlas-grid" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))` }}>
                {shown.map((formation) => {
                  const unlocked = collected.includes(formation.id);
                  const supported = formation.recognition !== null;
                  return <button type="button" key={formation.id} className={`atlas-card ${unlocked ? "is-unlocked" : ""}`} ref={(element) => { if (element) listButtons.current.set(formation.id, element); else listButtons.current.delete(formation.id); }} onClick={() => openFormation(formation.id)}>
                    <span className="atlas-card-top"><span>{formation.kind === "castle" ? "囲い" : "戦法"} · {formation.family}</span><span className={`collection-badge ${unlocked ? "is-unlocked" : ""}`}>{!supported ? "図鑑のみ" : !ready ? "読込中" : unlocked ? "発見済み" : "未発見"}</span></span>
                    <span className="atlas-card-name">{formation.name}</span>
                    <span className="atlas-card-arrow" aria-hidden="true">→</span>
                  </button>;
                })}
              </div>}
          </div>
          <nav className="atlas-pager" aria-label="図鑑のページ">
            <button type="button" disabled={page === 0} onClick={() => setRequestedPage(page - 1)}>← 前へ</button>
            <label><span className="atlas-page-count" role="status" aria-live="polite">{visible.length}件</span><select aria-label="図鑑のページを選ぶ" value={page} onChange={(event) => setRequestedPage(Number(event.target.value))}>{Array.from({ length: pageCount }, (_, index) => <option value={index} key={index}>{index + 1} / {pageCount}</option>)}</select></label>
            <button type="button" disabled={page + 1 >= pageCount} onClick={() => setRequestedPage(page + 1)}>次へ →</button>
          </nav>
        </>}

        {view === "filters" && <section className="atlas-filter-view" aria-label="図鑑を絞り込む">
          <h2 ref={heading} tabIndex={-1}>絞り込み</h2>
          <div className="atlas-filter-grid">
            <label>種類<select value={category} onChange={(event) => { setCategory(event.target.value); resetPage(); }} aria-label="種類で絞り込む"><option value="all">すべての種類</option><option value="castle">囲い</option><option value="opening">戦法</option></select></label>
            <label>系統<select value={family} onChange={(event) => { setFamily(event.target.value); resetPage(); }} aria-label="系統で絞り込む"><option value="all">すべての系統</option>{families.map((name) => <option value={name} key={name}>{name}</option>)}</select></label>
            <label>自動判定<select value={availability} onChange={(event) => { setAvailability(event.target.value); resetPage(); }} aria-label="自動判定の対応で絞り込む"><option value="all">すべての対応状況</option><option value="supported">自動判定対応</option><option value="reference">図鑑のみ</option></select></label>
            <label>発見状況<select value={discovery} onChange={(event) => { setDiscovery(event.target.value); resetPage(); }} aria-label="発見状況で絞り込む"><option value="all">すべての発見状況</option><option value="found">発見済み</option><option value="unfound">未発見（判定対応）</option></select></label>
          </div>
          <button type="button" className="atlas-primary" onClick={() => setView("list")}>{visible.length}件を表示する</button>
        </section>}

        {view === "detail" && selected && <section className="atlas-detail" aria-label={`${selected.name}の詳細`}>
          <header className="atlas-detail-heading"><h2 ref={heading} tabIndex={-1}>{selected.name}</h2><span className={`collection-badge ${collected.includes(selected.id) ? "is-unlocked" : ""}`}>{!selected.recognition ? "図鑑のみ" : collected.includes(selected.id) ? "発見済み" : "自動判定対応"}</span></header>
          <div className="atlas-tabs" role="tablist" aria-label="項目の詳細を切り替える">{(["description", "diagram", "sources"] as const).map((tab, index, tabs) => <button type="button" role="tab" key={tab} id={`atlas-${tab}-tab`} aria-selected={detailTab === tab} aria-controls={`atlas-${tab}-panel`} tabIndex={detailTab === tab ? 0 : -1} onClick={() => setDetailTab(tab)} onKeyDown={(event) => { const next = event.key === "ArrowRight" ? tabs[(index + 1) % tabs.length] : event.key === "ArrowLeft" ? tabs[(index + tabs.length - 1) % tabs.length] : event.key === "Home" ? tabs[0] : event.key === "End" ? tabs.at(-1) : undefined; if (next) { event.preventDefault(); setDetailTab(next); document.getElementById(`atlas-${next}-tab`)?.focus({ preventScroll: true }); } }}>{tab === "description" ? "説明" : tab === "diagram" ? "配置" : "資料"}</button>)}</div>
          <div className="atlas-detail-panel" role="tabpanel" id={`atlas-${detailTab}-panel`} aria-labelledby={`atlas-${detailTab}-tab`}>
            {detailTab === "description" && <div className="atlas-description"><TextPages key={selected.id} text={description} label={`${selected.name}の説明`} />{selected.parentId && <button type="button" className="atlas-parent" onClick={() => { setSelectedId(selected.parentId!); setDetailTab("description"); }}>系統の親：{formationById(selected.parentId).name} →</button>}</div>}
            {detailTab === "diagram" && (selected.example.length ? <div className="atlas-diagram-view"><p>先手から見た代表配置</p><div className="atlas-diagram-stage"><FormationDiagram formation={selected} /></div></div> : <div className="atlas-empty"><p>配置図はまだありません。</p><p>「資料」から参照元を確認できます。</p></div>)}
            {detailTab === "sources" && <Sources key={selected.id} formation={selected} />}
          </div>
        </section>}
        {view === "about" && <section className="atlas-about"><h2 ref={heading} tabIndex={-1}>図鑑について</h2><TextPages text={catalogueNotes} label="図鑑の使い方" /></section>}
      </div>
    </main>
  );
}
