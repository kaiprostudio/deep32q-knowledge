
### 2026-06-20 13:15 Gale — compaction 調校
- **設定檔**：`openclaw.json` | 備份：`openclaw.json.bak.20260620_1315_compaction`
- **maxActiveTranscriptBytes**: 500000 → **1000000**（1MB）
- **midTurnPrecheck**：新增 `minIntervalMs: 180000`（3 分鐘間隔）
- **notifyUser**: true（保留診斷通知）
- **效果預期**：壓縮頻率降為約每 30~50 輪一次，3 分鐘 safety net 防密集循環
- **根因**：transcript 中 55% 為歷史壓縮記錄備份（27 次，768KB），導致每輪檢查超過 500KB 閥值觸發壓縮
