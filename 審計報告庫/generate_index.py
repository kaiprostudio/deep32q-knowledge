#!/usr/bin/env python3
"""Deep32Q 審計報告公司 index.md 產生器 — 支援多日期版本 + 自動化側邊欄"""
import os, re, json

BASE = "/Users/kaipro/.openclaw/skills/NEW_Deep32Q/審計報告庫"
SIDEBAR_OUT = "/Users/kaipro/.openclaw/skills/NEW_Deep32Q/sidebar_data"

CNAME = {
    "2313_華通": "華通電腦", "6239_力成": "力成", "2492_華新科": "華新科",
    "3036_文曄": "文曄", "3105_穩懋": "穩懋", "3135_凌航": "凌航",
    "3163_波若威": "波若威", "3189_景碩": "景碩", "3680_家登": "家登",
    "4967_十銓": "十銓", "6257_矽格": "矽格", "6261_久元": "久元",
    "6290_良維": "良維", "6442_光聖": "光聖", "6903_巨漢": "巨漢",
    "8064_東捷": "東捷", "8074_鉅橡": "鉅橡", "8103_瀚荃": "瀚荃",
    "1727_中華化": "中華化",
}

total_generated = 0
os.makedirs(SIDEBAR_OUT, exist_ok=True)

for cat in ["經營審計", "財務審計"]:
    # ─── 收集此類別所有公司資料（用於側邊欄排序） ───
    companies = []

    for d in sorted(os.listdir(os.path.join(BASE, cat))):
        cp = os.path.join(BASE, cat, d)
        if not os.path.isdir(cp) or d.startswith('.'):
            continue
        code = d.split('_')[0]
        name = CNAME.get(d, d)
        group_label = "經營組" if cat == "經營審計" else "財務組"

        # 掃描日期子目錄 (YYYYMMDD)
        dates = sorted([x for x in os.listdir(cp) if x.isdigit()], reverse=True)
        if not dates:
            continue

        # 側邊欄版本數標示
        ver_count = len(dates)
        sidebar_text = f"{code} {name}"
        if ver_count > 1:
            sidebar_text += f" ({ver_count}版)"

        companies.append({
            "text": sidebar_text,
            "link": f"/審計報告庫/{cat}/{d}/",
            "latest_date": dates[0],
        })

        items = []
        for dt in dates:
            dp = os.path.join(cp, dt)
            if not os.path.isdir(dp):
                continue
            for f in sorted(os.listdir(dp)):
                if not f.endswith('.md') or f == 'index.md':
                    continue
                fid = re.match(r'([A-Z]\d+)', f)
                rid = fid.group(1) if fid else f.replace('.md', '')
                title = f.replace('.md', '')
                items.append((dt, rid, f, title))
        items.sort(key=lambda x: (x[0], x[1]))

        # 產生 index.md
        lines = [
            f"# {code} {name} — {group_label}",
            "",
            f"- **審計日期**：{' / '.join(dates)}",
            "",
            "<script setup>",
            f"const reportItems = [",
        ]
        for dt, rid, f, title in items:
            lines.append(f"  {{ id: '{rid}', title: '{title}', path: './{dt}/{f}', date: '{dt}' }},")
        lines += [
            "]",
            "</script>",
            "",
            "<AuditAccordion",
            f'  stock-code="{code}"',
            f'  stock-name="{name}"',
            f'  audit-date="{dates[0] if dates else ""}"',
            f'  :reports="reportItems"',
            '  rating=""',
            "/>",
        ]
        with open(os.path.join(cp, "index.md"), 'w', encoding='utf-8') as f:
            f.write("\n".join(lines) + "\n")
        total_generated += 1
        print(f"✅ {cat}/{d} ({dates[0]} → {dates[-1]})")

    # ─── 依照最新日期降序排列並輸出側邊欄 JSON ───
    companies.sort(key=lambda c: c["latest_date"], reverse=True)
    sidebar_items = [{"text": c["text"], "link": c["link"]} for c in companies]
    out_path = os.path.join(SIDEBAR_OUT, f"{cat}.json")
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(sidebar_items, f, ensure_ascii=False, indent=2)
    print(f"📋 側邊欄資料寫入 {out_path}（{len(sidebar_items)} 筆）")

print(f"\n總計產生 {total_generated} 家公司 index.md")
