#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
報告量化審計.py — Deep32Q 一站式品管核心
版本：v2.1 (Bear Mandate Update)

職責：
  1. 結構合規性掃描：驗證六大 Markdown 章節是否完整且順序正確。
  2. 數字密度掃描：檢查診斷評級/答詢詳解的實質財報數字密度。
  3. 華爾街空頭視角偵測：強制偵測「專家評析」是否包含風險批判性分析。
  4. 字數保真度：使用 85% 安全下限容差。

駁回規則（紅燈 FATAL — 必須退回 L3）：
  - 少一個或多個必要 ## 章節
  - 章節順序錯誤
  - 缺乏「華爾街空頭視角」(Skepticism Mandate)：關鍵字命中 < 2
  - 關鍵章節字數低於下限的 85%
"""

import os
import re
import sys
from typing import List, Dict, Tuple

# ═══════════════════════════════════════════════════════════
#  常數定義 (Constants)
# ═══════════════════════════════════════════════════════════

REQUIRED_SECTIONS = [
    "## 📋 審計題目",
    "## 🎯 專家直斷",
    "## 📊 診斷評級",
    "## 🔍 答詢詳解",
    "## 💡 專家評析",
    "## 📚 證據來源"
]

WORD_LIMITS: Dict[str, Tuple[int, int]] = {
    "## 🎯 專家直斷":   (40,  80),
    "## 📊 診斷評級":  (80,  150),
    "## 🔍 答詢詳解":  (200, 450),
    "## 💡 專家評析":  (200, 450),
}

FATAL_THRESHOLD = 0.85

# 空頭視角關鍵字集
SKEPTICISM_KEYWORDS = [
    "風險", "利空", "挑戰", "阻礙", "失敗", "衰退", "下滑",
    "警訊", "壓力", "疑慮", "不確定", "競爭", "侵蝕", "透支",
    "槓桿", "地雷", "過度集中", "極端值", "惡化", "違約",
    "利空", "下行", "飽和", "脆弱", "泡沫"
]

NUMBER_PATTERN = re.compile(
    r'(?:'
    r'\d+\.?\d*\s*%'          
    r'|\d+\.?\d*\s*億'        
    r'|\d+\.?\d*\s*萬'        
    r'|\d+\.?\d*\s*元'        
    r'|\d+\.?\d*\s*倍'        
    r'|YoY\s*[+-]?\d+\.?\d*' 
    r'|MoM\s*[+-]?\d+\.?\d*' 
    r'|\d{4}\s*年'            
    r'|\d+\s*Q[1-4]'         
    r')'
)

DENSITY_MIN_HITS = 3  

# ═══════════════════════════════════════════════════════════
#  工具函數 (Utility Functions)
# ═══════════════════════════════════════════════════════════

def count_chinese_chars(text: str) -> int:
    cleaned = re.sub(r'[#*_`\[\]\(\)\-\|]|\[.*?\]\(.*?\)', '', text)
    cleaned = re.sub(r'\s+', '', cleaned)
    return len(re.findall(r'[\u4e00-\u9fff\u3000-\u303F\uFF00-\uFFEF]', cleaned))


def split_sections(content: str) -> Dict[str, str]:
    parts = re.split(r'^(##\s+[^\n]+)', content, flags=re.MULTILINE)
    sections = {}
    for i in range(1, len(parts), 2):
        title_raw = parts[i].strip()
        body = parts[i+1].strip() if (i+1) < len(parts) else ""
        for canonical in REQUIRED_SECTIONS:
            if canonical in title_raw:
                sections[canonical] = body
                break
    return sections

# ═══════════════════════════════════════════════════════════
#  各項核查函數 (Check Functions)
# ═══════════════════════════════════════════════════════════

def check_structure(content: str) -> List[Dict]:
    errors = []
    found_order = []
    h2_titles = re.findall(r'^(##\s+[^\n]+)', content, re.MULTILINE)
    for canonical in REQUIRED_SECTIONS:
        found = False
        for i, raw in enumerate(h2_titles):
            if canonical in raw:
                found_order.append(i)
                found = True
                break
        if not found:
            errors.append({"level": "FATAL", "code": "MISSING_SECTION", "message": f"缺少必要章節：'{canonical}'"})
    if len(found_order) >= 2:
        for idx in range(len(found_order) - 1):
            if found_order[idx] > found_order[idx + 1]:
                errors.append({"level": "FATAL", "code": "WRONG_ORDER", "message": f"章節順序異常：請依照六大章節標準順序排列"})
                break
    return errors


def check_word_counts(sections: Dict[str, str]) -> Tuple[List[Dict], Dict[str, int]]:
    issues = []
    word_counts = {}
    for section_key, (min_w, max_w) in WORD_LIMITS.items():
        body = sections.get(section_key, "")
        count = count_chinese_chars(body)
        word_counts[section_key] = count
        fatal_floor = int(min_w * FATAL_THRESHOLD)
        if count < fatal_floor:
            issues.append({"level": "FATAL", "code": "WORDCOUNT_CRITICAL_LOW", "message": f"[{section_key}] 字數 {count} 嚴重不足！下限 {min_w} 字。"})
        elif count < min_w:
            issues.append({"level": "WARNING", "code": "WORDCOUNT_SLIGHTLY_LOW", "message": f"[{section_key}] 字數 {count} 略低於建議下限（{min_w}）。"})
        elif count > int(max_w * 1.2):
            issues.append({"level": "FATAL", "code": "WORDCOUNT_CRITICAL_HIGH", "message": f"[{section_key}] 字數 {count} 嚴重超標！上限 {max_w} 字。"})
        elif count > max_w:
            issues.append({"level": "WARNING", "code": "WORDCOUNT_SLIGHTLY_HIGH", "message": f"[{section_key}] 字數 {count} 略超建議上限（{max_w}）。"})
    return issues, word_counts


def check_data_density(sections: Dict[str, str]) -> List[Dict]:
    warnings = []
    for section_key in ["## 📊 診斷評級", "## 🔍 答詢詳解"]:
        body = sections.get(section_key, "")
        hits = NUMBER_PATTERN.findall(body)
        if len(hits) < DENSITY_MIN_HITS:
            warnings.append({"level": "WARNING", "code": "LOW_DATA_DENSITY", "message": f"[{section_key}] 量化數據標記僅偵測到 {len(hits)} 個。"})
    return warnings


def check_skepticism(sections: Dict[str, str]) -> List[Dict]:
    """5. 華爾街空頭視角偵測 (Bear Mandate) — 紅燈 FATAL。"""
    errors = []
    expert_body = sections.get("## 💡 專家評析", "")
    hits = [kw for kw in SKEPTICISM_KEYWORDS if kw in expert_body]
    if len(hits) < 2:
        errors.append({
            "level": "FATAL",
            "code": "SKEPTICISM_MISSING",
            "message": (
                f"[## 💡 專家評析] 缺乏「華爾街空頭視角 (Skepticism Mandate)」！"
                f" 僅命中 {len(hits)} 個空頭關鍵字（必須 ≥ 2）。報告過於樂觀，強制駁回。"
            )
        })
    return errors


# ═══════════════════════════════════════════════════════════
#  主程式整合輸出 (Main)
# ═══════════════════════════════════════════════════════════

def audit_report(report_path: str) -> bool:
    if not os.path.exists(report_path):
        print(f"\n❌  檔案不存在：{report_path}")
        return False
    with open(report_path, 'r', encoding='utf-8') as f:
        content = f.read()
    sections = split_sections(content)
    all_issues = []
    all_issues += check_structure(content)
    word_issues, word_counts = check_word_counts(sections)
    all_issues += word_issues
    all_issues += check_data_density(sections)
    all_issues += check_skepticism(sections)
    fatals   = [i for i in all_issues if i["level"] == "FATAL"]
    warnings = [i for i in all_issues if i["level"] == "WARNING"]
    is_pass  = len(fatals) == 0
    print(f"\n{'✅  整體判定：ALLOWED' if is_pass else '❌  整體判定：REJECTED'}\n")
    if fatals:
        for err in fatals: print(f"  ❌ [{err['code']}] {err['message']}")
    if warnings:
        for w in warnings: print(f"  ⚠️  [{w['code']}] {w['message']}")
    return is_pass


if __name__ == "__main__":
    if len(sys.argv) < 2: sys.exit(1)
    passed = audit_report(sys.argv[1])
    sys.exit(0 if passed else 1)
