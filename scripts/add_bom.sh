#!/bin/bash
# add_bom.sh — 在 .md 檔案開頭插入 UTF-8 BOM (EF BB BF)
# 用法: ./add_bom.sh <檔案或目錄>
# 若目錄，則遞迴處理所有 .md 檔案
# 已有 BOM 者跳過

set -euo pipefail

TARGET="$1"

if [ -d "$TARGET" ]; then
  find "$TARGET" -name "*.md" -type f -exec "$0" {} \;
  exit 0
fi

if [ ! -f "$TARGET" ]; then
  echo "❌ 檔案不存在: $TARGET"
  exit 1
fi

# 檢查是否已有 BOM
BOM=$(xxd -l 3 -p "$TARGET")
if [ "$BOM" = "efbbbf" ]; then
  echo "⏭️  已有 BOM: $TARGET"
  exit 0
fi

# 插入 BOM
printf '\xEF\xBB\xBF' | cat - "$TARGET" > "${TARGET}.bom" && mv "${TARGET}.bom" "$TARGET"
echo "✅ 已加入 BOM: $TARGET"