#!/usr/bin/env python3
"""驗證每日報告是否已正確建入 _site（扁平化 <hash>.html + route_map.json 架構）。

取代舊版以目錄路徑 _site/每日報告/<日期>/ 為準的檢查（該架構已不存在）。

用法：
    python3 _build/verify_site.py [YYYY-MM-DD]
    未給日期時，預設為台灣時間 (UTC+8) 當天。

輸出：四份報告逐檔命中狀況 + RESULT 行。
退出碼：0 = 全部命中；1 = 有缺漏。
"""
import datetime
import json
import os
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REPORTS = ["市場情緒", "黃金追蹤", "白銀追蹤", "黃豆追蹤"]


def taipei_today() -> str:
    tz_taipei = datetime.timezone(datetime.timedelta(hours=8))
    return datetime.datetime.now(tz_taipei).strftime("%Y-%m-%d")


def main() -> int:
    date = sys.argv[1] if len(sys.argv) > 1 else taipei_today()
    route_map_path = os.path.join(REPO, "_site", "route_map.json")

    if not os.path.exists(route_map_path):
        print(f"❌ 找不到 {route_map_path}")
        return 1

    with open(route_map_path, encoding="utf-8") as fh:
        route_map = json.load(fh)

    missing = []
    for name in REPORTS:
        key = f"Deep32Q知識庫/每日報告/{date}/{name}_{date}"
        rel = route_map.get(key)
        target = os.path.join(REPO, "_site", rel.lstrip("/")) if rel else None
        ok = bool(rel) and os.path.exists(target)
        suffix = f" → {rel}" if rel else " → (無此路由)"
        print(f"{'✅' if ok else '❌'} {key}{suffix}")
        if not ok:
            missing.append(name)

    print(f"RESULT: {'PASS' if not missing else 'FAIL ' + ','.join(missing)} ({date})")
    return 0 if not missing else 1


if __name__ == "__main__":
    sys.exit(main())
