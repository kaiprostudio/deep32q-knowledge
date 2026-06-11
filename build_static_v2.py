#!/usr/bin/env python3
"""Build a zero-JS static HTML from Markdown files — checkbox hack for mobile menu."""
import os, re, json
from pathlib import Path
from html import escape

BASE = Path("/Users/kaipro/.openclaw/skills/NEW_Deep32Q/Deep32Q知識庫")
OUT = BASE / "index.html"

ARTICLES = [
    ("🤖 機器人產業", "供應鏈拆解",        "產業洞察/機器人研究/機器人研究_產業供應鏈拆解.md"),
    ("🤖 機器人產業", "台股供應鏈機會",    "產業洞察/機器人研究/機器人研究_台股供應鏈機會.md"),
    ("🤖 機器人產業", "相關個股清單",      "產業洞察/機器人研究/機器人研究_相關個股清單.md"),
    ("🥈 白銀市場", "需求面分析",          "產業洞察/白銀研究/白銀研究_需求面分析.md"),
    ("🥈 白銀市場", "供給面分析",          "產業洞察/白銀研究/白銀研究_供給面分析.md"),
    ("🥈 白銀市場", "價格與估值分析",      "產業洞察/白銀研究/白銀研究_價格與估值分析.md"),
    ("🥈 白銀市場", "太陽能產業影響",      "產業洞察/白銀研究/白銀研究_太陽能產業影響.md"),
    ("🥈 白銀市場", "太空資料中心",        "產業洞察/白銀研究/白銀研究_太空資料中心.md"),
]

def md_to_html(text):
    lines = text.split("\n")
    out = []
    in_table = False
    in_list = False
    in_code = False
    code_buf = []
    in_blockquote = False
    i = 0
    while i < len(lines):
        line = lines[i]
        if line.startswith("```"):
            if in_code:
                out.append(f"<pre><code>{escape('\n'.join(code_buf))}</code></pre>\n")
                code_buf = []; in_code = False; i += 1; continue
            else:
                in_code = True; i += 1; continue
        if in_code:
            code_buf.append(line); i += 1; continue
        if line.startswith("> "):
            if not in_blockquote:
                out.append("<blockquote>\n"); in_blockquote = True
            out.append(f"  <p>{inline_md(line[2:])}</p>\n"); i += 1; continue
        else:
            if in_blockquote: out.append("</blockquote>\n"); in_blockquote = False
        if line.startswith("| ") and "---" not in line:
            if not in_table:
                out.append('<div class="table-wrap"><table>\n'); in_table = True
            cells = [c.strip() for c in line.split("|")[1:-1]]
            is_header = (i+1 < len(lines) and "---" not in lines[i+1])
            sep = '</th><th>' if is_header else '</td><td>'
            tag = 'th' if is_header else 'td'
            out.append(f"  <tr><{tag}>{sep.join(inline_md(c) for c in cells)}</{tag}></tr>\n")
            i += 1; continue
        if line.startswith("|---") or line.startswith("|:-"):
            i += 1; continue
        if in_table:
            if line.strip() == "" or not line.startswith("| "):
                out.append("</table></div>\n"); in_table = False
        if line.strip() == "":
            if in_list: out.append("</ul>\n"); in_list = False
            out.append("\n"); i += 1; continue
        h_match = re.match(r"^(#{1,4})\s+(.+)$", line)
        if h_match:
            lv = len(h_match.group(1))
            out.append(f"<h{lv}>{inline_md(h_match.group(2))}</h{lv}>\n"); i += 1; continue
        li_match = re.match(r"^[-*+]\s+(.+)$", line)
        if li_match:
            if not in_list: out.append("<ul>\n"); in_list = True
            out.append(f"  <li>{inline_md(li_match.group(1))}</li>\n"); i += 1; continue
        out.append(f"<p>{inline_md(line)}</p>\n"); i += 1
    if in_code: out.append(f"<pre><code>{escape('\n'.join(code_buf))}</code></pre>\n")
    if in_list: out.append("</ul>\n")
    if in_blockquote: out.append("</blockquote>\n")
    if in_table: out.append("</table></div>\n")
    return "".join(out)

def inline_md(text):
    text = escape(text)
    text = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'\*(.+?)\*', r'<em>\1</em>', text)
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    return text

nav_items = []
body_sections = []

for n, (cat, title, relpath) in enumerate(ARTICLES):
    aid = f"art{n}"
    md_path = BASE / relpath
    if not md_path.exists():
        continue
    raw = md_path.read_text("utf-8")
    if raw.startswith("# "):
        raw = re.sub(r"^# .+?\n", "", raw, count=1)
    html_body = md_to_html(raw.strip())
    body_sections.append(
        f'<article id="{aid}">\n'
        f'<h2>{escape(cat)} — {escape(title)}</h2>\n'
        f'{html_body}\n'
        f'</article>\n'
    )
    nav_items.append(
        f'<li class="nav-group">\n'
        f'  <span class="nav-cat">{escape(cat)}</span>\n'
        f'  <a href="#{aid}" class="nav-link">{escape(title)}</a>\n'
        f'</li>\n'
    )

navigation_html = "".join(nav_items)
articles_html = "\n<hr>\n".join(body_sections)

HTML = fr"""<!DOCTYPE html>
<html lang="zh-TW">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Deep32Q 研究報告</title>
<style>
*, *::before, *::after {{ box-sizing: border-box; margin: 0; padding: 0; }}
:root {{ --bg: #0f172a; --fg: #e2e8f0; --accent: #60a5fa; --accent2: #a78bfa; --border: #334155; --card: #1e293b; --nav-bg: #1a2332; --hover: #334155; }}
body {{ background: var(--bg); color: var(--fg); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans TC', sans-serif; line-height: 1.7; display: flex; min-height: 100vh; }}
/* ── Sidebar desktop ── */
nav#sidebar {{ width: 280px; min-width: 280px; background: var(--nav-bg); border-right: 1px solid var(--border); padding: 1.5rem 0; height: 100vh; position: sticky; top: 0; overflow-y: auto; }}
nav#sidebar h1 {{ font-size: 1.1rem; padding: 0 1.2rem 1rem; border-bottom: 1px solid var(--border); margin-bottom: 0.75rem; color: var(--accent); }}
nav#sidebar ul {{ list-style: none; }}
nav#sidebar li.nav-group {{ margin: 0.25rem 0; }}
nav#sidebar .nav-cat {{ display: block; padding: 0.3rem 1.2rem; font-size: 0.8rem; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }}
nav#sidebar a.nav-link {{ display: block; padding: 0.45rem 1.2rem 0.45rem 1.8rem; color: var(--fg); text-decoration: none; font-size: 0.9rem; border-left: 3px solid transparent; transition: all 0.15s; }}
nav#sidebar a.nav-link:hover {{ background: var(--hover); border-left-color: var(--accent); color: #fff; }}
/* ── Main ── */
main {{ flex: 1; max-width: 960px; padding: 2rem 2.5rem; }}
/* ── Articles ── */
article {{ margin-bottom: 3rem; }}
article h2 {{ font-size: 1.5rem; color: var(--accent2); margin-bottom: 1rem; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border); }}
article h3 {{ font-size: 1.2rem; color: var(--accent); margin: 1.5rem 0 0.75rem; }}
article h4 {{ font-size: 1.05rem; margin: 1.2rem 0 0.5rem; }}
article p {{ margin: 0.6rem 0; }}
article ul {{ margin: 0.6rem 0; padding-left: 1.5rem; }}
article li {{ margin: 0.3rem 0; }}
article strong {{ color: #facc15; }}
article code {{ background: #334155; padding: 0.15rem 0.4rem; border-radius: 3px; font-size: 0.9em; }}
article pre {{ background: #1a2332; padding: 1rem; border-radius: 6px; overflow-x: auto; margin: 1rem 0; border: 1px solid var(--border); }}
article blockquote {{ background: #1e293b; border-left: 4px solid var(--accent); margin: 1rem 0; padding: 0.75rem 1rem; border-radius: 0 6px 6px 0; }}
article blockquote p {{ margin: 0.2rem 0; }}
article hr {{ border: none; border-top: 1px solid var(--border); margin: 2rem 0; }}
.table-wrap {{ overflow-x: auto; margin: 1rem 0; }}
table {{ width: 100%; border-collapse: collapse; font-size: 0.9rem; }}
th, td {{ border: 1px solid var(--border); padding: 0.5rem 0.75rem; text-align: left; }}
th {{ background: #1a2332; color: var(--accent); font-weight: 600; white-space: nowrap; }}
tr:nth-child(even) td {{ background: rgba(255,255,255,0.02); }}
footer {{ margin-top: 3rem; padding-top: 1.5rem; border-top: 1px solid var(--border); text-align: center; color: #64748b; font-size: 0.85rem; }}
/* ── Checkbox hack (ZERO JS) ── */
#menu-chk {{ display: none; }}
/* Mobile-only label */
label[for="menu-chk"] {{ display: none; }}

@media (max-width: 768px) {{
  body {{ flex-direction: column; }}
  nav#sidebar {{ width: 100%; min-width: 0; height: auto; position: static; display: none; border-right: none; border-bottom: 1px solid var(--border); padding: 1rem 0; }}
  /* Show sidebar when checkbox is checked */
  #menu-chk:checked ~ nav#sidebar {{ display: block; }}
  /* Mobile toggle label */
  label[for="menu-chk"] {{ 
    display: block; text-align: center; 
    background: var(--card); border-bottom: 1px solid var(--border);
    padding: 0.6rem; font-size: 0.95rem; cursor: pointer;
    color: var(--accent); user-select: none;
  }}
  label[for="menu-chk"]:hover {{ background: var(--hover); }}
  /* Change label text when sidebar is open */
  #menu-chk:checked ~ label[for="menu-chk"]::before {{ content: "✕ 收起目錄"; }}
  label[for="menu-chk"]::before {{ content: "☰ 開啟目錄"; }}
  main {{ padding: 1rem; }}
}}
</style>
</head>
<body>

<input type="checkbox" id="menu-chk" hidden>
<label for="menu-chk"></label>

<nav id="sidebar">
  <h1>📚 Deep32Q 研究報告</h1>
  <ul>
{navigation_html}
  </ul>
</nav>

<main>
{articles_html}
<footer>Storm × DR32 · 2026-06-11</footer>
</main>

</body>
</html>"""

OUT.write_text(HTML, "utf-8")

size = len(HTML)
print(f"✅ Written {size} bytes to {OUT}")

# Validate
checks = [
    ("has html close", "</html>" in HTML),
    ("has article 0", '<article id="art0">' in HTML),
    ("has article 7", '<article id="art7">' in HTML),
    ("has nav link", 'href="#art0"' in HTML),
    ("has checkbox", 'id="menu-chk"' in HTML),
    ("no onclick", "onclick" not in HTML),
    ("no addEventListener", "addEventListener" not in HTML),
    ("no JSON.parse", "JSON.parse" not in HTML),
]
for name, ok in checks:
    print(f"  {'✅' if ok else '❌'} {name}")
print(f"✅ All {len(checks)} checks passed") if all(c[1] for c in checks) else print("❌ SOME CHECKS FAILED")
