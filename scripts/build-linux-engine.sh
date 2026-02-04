#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
OUT_DIR="$ROOT_DIR/bin/yaneiraou/engine-linux"
NN_BIN_SRC="$ROOT_DIR/bin/yaneiraou/engine/eval/nn.bin"

if [[ ! -f "$NN_BIN_SRC" ]]; then
  echo "nn.bin が見つかりません: $NN_BIN_SRC" >&2
  exit 1
fi

mkdir -p "$OUT_DIR"

docker build --platform=linux/amd64 -f "$ROOT_DIR/scripts/Dockerfile.yaneuraou-linux" -t yaneuraou-linux "$ROOT_DIR"

CONTAINER_ID=$(docker create --platform=linux/amd64 yaneuraou-linux)
docker cp "$CONTAINER_ID":/out/YaneuraOu-by-gcc "$OUT_DIR/YaneuraOu-by-gcc"
docker rm "$CONTAINER_ID" >/dev/null

chmod +x "$OUT_DIR/YaneuraOu-by-gcc"
mkdir -p "$OUT_DIR/eval"
cp "$NN_BIN_SRC" "$OUT_DIR/eval/nn.bin"

echo "Linuxバイナリ配置完了: $OUT_DIR/YaneuraOu-by-gcc"
