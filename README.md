# 将棋AI対戦（Webアプリ）

ブラウザで遊べる将棋AI対戦アプリです。先手/後手、AI強さ、思考時間を設定して対局できます。棋譜は日本語表記（「▲」「△」「同」「成」「不成」「打」）で右側に表示されます。

## 主な機能

- 先手/後手選択、AI強さ/思考時間の設定
- 盤面/持ち駒の駒画像表示（0枚は非表示）
- 直前の指し手ハイライト
- AI思考中のモーダル表示
- 日本語棋譜表示（固定高さ・スクロール）
- やねうら王（USI）連携。失敗時はローカルAIへフォールバック

## 技術スタック

- Next.js (App Router)
- TypeScript
- Tailwind CSS

## セットアップ

### 1. 依存関係のインストール

```bash
npm install
```

### 2. USIエンジン（やねうら王）の用意

- 実行ファイルのパスを環境変数に指定します。
- macOS / Linux それぞれのバイナリを用意してください。

`.env.local`:

```bash
YANEURAOU_PATH=/absolute/path/to/engine
```

### 3. 開発サーバ起動

```bash
npm run dev
```

ブラウザで http://localhost:3000 を開きます。

## デプロイについて

- Linux 環境へデプロイする場合は Linux 向けバイナリを用意してください。
- AI設定（Threads/Hashなど）はサーバー側で調整済みですが、環境に合わせて見直してください。

## ディレクトリ概要

- app/ : UIと状態管理
- app/api/ai/route.ts : USIエンジン連携API
- app/components/ : 盤面/持ち駒/棋譜/設定などのUI部品
- app/lib/ : 将棋ルール/AI/評価関数

## 主要な型（TypeScript）

定義は [app/lib/types.ts](app/lib/types.ts) を参照してください。

- `Owner`: 先手/後手を表す識別子（"b" / "w"）。
- `PieceType`: 駒種（"P" "L" "N" "S" "G" "B" "R" "K"）。
- `Piece`: 盤上の駒（駒種・所有者・成り状態）。
- `Board`: 9x9 の盤面配列。
- `Hands`: 持ち駒の数を保持する連想配列。
- `Move`: 指し手（移動/打ち、成り情報を含む）。

## 主要な関数

定義は [app/lib/shogi.ts](app/lib/shogi.ts) 経由で再エクスポートされています。

- `applyMove()`: 指し手を盤面/持ち駒に適用して新状態を返す。
- `buildLegalMoves()`: 盤面全体の合法手を生成。
- `getLegalMovesForPiece()`: 指定した駒の合法手を生成。
- `getLegalDropMoves()`: 打ち手の合法手を生成。
- `canApplyPromotionOption()`: 成り/不成の可否を判定。
- `isInCheck()`: 王手判定。
- `findKing()`: 王の位置を探索。
- `chooseAiMove()`: AIの指し手を選択（USI優先、失敗時ローカルAI）。

## 主要なコンポーネント

コンポーネントは [app/components](app/components) にあります。

- `ShogiBoard`: 盤面描画とクリック処理。
- `HandsPanel`: 持ち駒表示・選択。
- `KifuPanel`: 日本語棋譜表示（同/成/不成/打）。
- `SettingsPanel`: 先手/後手・AI設定の入力。
- `StatusPanel`: 手番/勝敗/王手表示。
- `ControlsPanel`: リセット・設定戻り。
- `PromotionModal`: 成/不成の選択モーダル。

## 注意

- USIエンジンが利用不可の場合、ローカルAIに自動フォールバックします。
- エンジンの評価関数（nn.bin）は実行ファイルと対応するものを使用してください。
