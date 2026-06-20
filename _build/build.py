#!/usr/bin/env python3
"""
Deep32Q Knowledge Site Builder
Builds a static HTML site from Markdown knowledge base files.

Usage: python3 _build/build.py
Output: _site/ directory (ready for GitHub Pages deployment)

Replace Vitepress entirely. No npm/node dependencies needed.
"""

import os
import re
import json
import shutil
import hashlib
from pathlib import Path
from datetime import datetime, timezone

# ── Configuration ──────────────────────────────────────────────
REPO_ROOT   = Path(__file__).resolve().parent.parent
SITE_ROOT   = REPO_ROOT / "_site"
BUILD_DIR   = REPO_ROOT / "_build"
KB_DIR      = REPO_ROOT / "Deep32Q知識庫"
AR_DIR      = REPO_ROOT / "審計報告庫"
CNAME_FILE  = REPO_ROOT / "CNAME"

SITE_TITLE  = "Deep32Q 系統化投資研究知識庫"
SITE_DOMAIN = "deep32q.kaiproapp.com"

# All HTML page templates live here as Python strings.

INDEX_HTML_TEMPLATE = """<!DOCTYPE html>
<html lang="zh-TW" data-theme="light">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<link rel="icon" href="/favicon.ico" type="image/x-icon">
<link rel="stylesheet" href="/style.css?v=2">
<meta name="description" content="Deep32Q 系統化投資研究知識庫 — 每日報告、產業洞察、32Q 審計報告">
</head>
<body>
<div id="app">
  <nav id="navbar">
    <div class="nav-inner">
      <a href="/" class="nav-logo">Deep32Q</a>
      <div class="nav-search">
        <input type="text" id="search-input" placeholder="搜尋知識庫（全文）" aria-label="搜尋知識庫">
        <div id="search-results" class="search-results hidden"></div>
      </div>
      <div class="nav-links">
        <a href="/" class="nav-link active" data-nav="daily">每日報告</a>
        <a href="/?p=industries" class="nav-link" data-nav="industries">產業洞察</a>
        <a href="/?p=audit" class="nav-link" data-nav="audit">審計報告</a>
        <a href="/admin/" class="nav-link" data-nav="admin">管理</a>
        <button id="theme-toggle" class="theme-toggle" aria-label="切換深色模式" title="切換深色模式">🌙</button>
      </div>
    </div>
  </nav>
  <main id="main-content">{body_html}</main>
</div>
<script src="/search.js?v=1"></script>
<script src="/content.js?v=2"></script>
</body>
</html>
"""


# ── Markdown to HTML (simple converter using stdlib) ───────────

def md_to_html(text: str) -> str:
    """Convert minimal Markdown to HTML using Python's standard library."""
    # Strip BOM (U+FEFF) which confuses markdown parsers
    if text and text[0] == '\ufeff':
        text = text[1:]
    try:
        import markdown
        return markdown.markdown(
            text,
            extensions=['fenced_code', 'tables', 'codehilite', 'nl2br', 'sane_lists']
        )
    except ImportError:
        pass

    # Fallback: simple inline parser
    # Strip BOM (U+FEFF)
    if text and text[0] == '\ufeff':
        text = text[1:]
    lines = text.split('\n')
    html_lines = []
    in_table = False
    table_rows = []
    in_code_block = False
    code_lines = []
    in_list = False
    list_type = None
    in_blockquote = False

    def close_code():
        nonlocal in_code_block
        if in_code_block:
            html_lines.append('<pre><code>' + '\n'.join(code_lines) + '</code></pre>\n')
            code_lines.clear()
            in_code_block = False

    def close_list():
        nonlocal in_list, list_type
        if in_list:
            html_lines.append(f'</{list_type}>\n')
            in_list = False
            list_type = None

    def close_blockquote():
        nonlocal in_blockquote
        if in_blockquote:
            html_lines.append('</blockquote>\n')
            in_blockquote = False

    for line in lines:
        # Code block
        if line.startswith('```'):
            if in_code_block:
                close_code()
            else:
                close_blockquote()
                close_list()
                in_code_block = True
                code_lines = []
            continue
        if in_code_block:
            code_lines.append(line)
            continue

        # Close block elements for non-blank-line transitions
        if line.strip() == '':
            close_code()
            close_list()
            close_blockquote()
            html_lines.append('\n')
            continue

        # Headings
        if line.startswith('###### '):
            close_list()
            html_lines.append(f'<h6>{line[7:]}</h6>\n')
            continue
        if line.startswith('##### '):
            close_list()
            html_lines.append(f'<h5>{line[6:]}</h5>\n')
            continue
        if line.startswith('#### '):
            close_list()
            html_lines.append(f'<h4>{line[5:]}</h4>\n')
            continue
        if line.startswith('### '):
            close_list()
            html_lines.append(f'<h3>{line[4:]}</h3>\n')
            continue
        if line.startswith('## '):
            close_list()
            html_lines.append(f'<h2>{line[3:]}</h2>\n')
            continue
        if line.startswith('# '):
            close_list()
            html_lines.append(f'<h1>{line[2:]}</h1>\n')
            continue

        # Blockquote
        if line.startswith('> '):
            close_list()
            if not in_blockquote:
                html_lines.append('<blockquote>\n')
                in_blockquote = True
            html_lines.append(f'<p>{line[2:]}</p>\n')
            continue
        if line.startswith('>'):
            close_list()
            if not in_blockquote:
                html_lines.append('<blockquote>\n')
                in_blockquote = True
            html_lines.append(f'<p>{line[1:]}</p>\n')
            continue
        close_blockquote()

        # Unordered list
        if line.startswith('- ') or line.startswith('* '):
            close_blockquote()
            if not in_list or list_type != 'ul':
                close_list()
                html_lines.append('<ul>\n')
                in_list = True
                list_type = 'ul'
            html_lines.append(f'<li>{line[2:]}</li>\n')
            continue

        # Ordered list
        if re.match(r'^\d+\.\s', line):
            close_blockquote()
            if not in_list or list_type != 'ol':
                close_list()
                html_lines.append('<ol>\n')
                in_list = True
                list_type = 'ol'
            html_lines.append(f'<li>{re.sub(r"^\d+\.\s", "", line)}</li>\n')
            continue

        # Horizontal rule
        if line.strip() == '---' or line.strip() == '***':
            close_list()
            html_lines.append('<hr>\n')
            continue

        # Table
        if '|' in line and line.strip().startswith('|'):
            cells = [c.strip() for c in line.strip().strip('|').split('|')]
            if re.match(r'^[\s:|,-]+$', line.strip()):
                continue  # separator row
            if not in_table:
                html_lines.append('<table>\n')
                in_table = True
                table_rows = []
            table_rows.append(cells)
            continue
        else:
            if in_table and table_rows:
                # First row = header
                html_lines.append('<thead><tr>\n')
                for c in table_rows[0]:
                    html_lines.append(f'<th>{c}</th>\n')
                html_lines.append('</tr></thead>\n')
                if len(table_rows) > 1:
                    html_lines.append('<tbody>\n')
                    for row in table_rows[1:]:
                        html_lines.append('<tr>\n')
                        for c in row:
                            html_lines.append(f'<td>{c}</td>\n')
                        html_lines.append('</tr>\n')
                    html_lines.append('</tbody>\n')
                html_lines.append('</table>\n')
                table_rows = []
                in_table = False
            if in_table:
                continue

        # Inline formatting for paragraphs
        # Bold
        line = re.sub(r'\*\*(.+?)\*\*', r'<strong>\1</strong>', line)
        # Italic
        line = re.sub(r'\*(.+?)\*', r'<em>\1</em>', line)
        # Inline code
        line = re.sub(r'`(.+?)`', r'<code>\1</code>', line)
        # Links
        line = re.sub(r'\[(.+?)\]\((.+?)\)', r'<a href="\2">\1</a>', line)

        close_list()
        html_lines.append(f'<p>{line}</p>\n')

    close_code()
    close_list()
    close_blockquote()

    return ''.join(html_lines)


def get_file_modified_time(filepath: Path) -> str:
    """Get file's last modified time as YYYY-MM-DD string."""
    try:
        mtime = os.path.getmtime(filepath)
        return datetime.fromtimestamp(mtime).strftime('%Y-%m-%d')
    except:
        return "未知"


def extract_title(content: str) -> str:
    """Extract first # heading from markdown content."""
    # Remove BOM and strip
    content = content.lstrip('\ufeff')
    for line in content.split('\n'):
        stripped = line.strip()
        if stripped.startswith('# '):
            return stripped[2:].strip()
    return "未命名文件"


def extract_summary(content: str, max_chars: int = 200) -> str:
    """Extract first paragraph as a summary."""
    for line in content.split('\n'):
        stripped = line.strip()
        if stripped and not stripped.startswith('#') and not stripped.startswith('>'):
            # Clean markdown inline
            clean = re.sub(r'[*#`\[\]]+', '', stripped)
            if len(clean) > max_chars:
                return clean[:max_chars] + '…'
            return clean
    return ""


def determine_category(relative_path: str) -> str:
    """Determine which section of the site a file belongs to."""
    p = relative_path.replace('\\', '/')
    if '/每日報告/' in p or p.startswith('每日報告/'):
        return 'daily'
    if '/產業洞察/' in p or p.startswith('產業洞察/'):
        return 'industry'
    if '/供應鏈拆解/' in p or p.startswith('供應鏈拆解/'):
        return 'supply_chain'
    return 'general'


def determine_category_by_route(route: str) -> str:
    """Determine category from the full route path (includes KB_DIR prefix)."""
    p = route.replace('\\', '/')
    if '每日報告' in p:
        return 'daily'
    if '審計報告庫' in p:
        return 'audit'
    if '產業洞察' in p:
        return 'industry'
    if '供應鏈拆解' in p:
        return 'supply_chain'
    return 'general'


def determine_emoji(category: str) -> str:
    return {'daily': '📅', 'industry': '📁', 'audit': '📊', 'general': '📄'}.get(category, '📄')


# ── Indexing ──────────────────────────────────────────────────

class IndexBuilder:
    """Build search index and category listings."""

    def __init__(self):
        self.documents = []  # [{id, title, path, category, content, summary, date}]
        self.daily_reports = {}  # date -> [documents]
        self.industries = {}  # industry -> [documents]
        self.audit_reports = {}  # stock -> {info, reports}

    def add_document(self, filepath: Path, relative_path: str):
        """Scan a single .md file and index it."""
        try:
            content = filepath.read_text(encoding='utf-8')
        except:
            return

        title = extract_title(content)
        summary = extract_summary(content)
        date = get_file_modified_time(filepath)
        category = determine_category(relative_path)

        doc_id = f'{category}/{relative_path}'
        # Use the output html path as route
        route = relative_path.replace('.md', '')
        # Override category using route-based check
        category = determine_category_by_route(route)

        doc = {
            'id': doc_id,
            'title': title,
            'path': relative_path,
            'route': route,
            'category': category,
            'content': content,
            'summary': summary,
            'date': date,
        }

        self.documents.append(doc)

        if category == 'daily':
            date_part = relative_path.split('/')
            # Daily report scanning: first check 每日報告/YYYY-MM-DD/ format
            # Also scan individual files: 市場情緒/YYYY-MM-DD.md
            # and 產業洞察/*/追蹤日誌/YYYY-MM-DD.md
            report_date = 'unknown'
            for part in date_part:
                if re.match(r'^\d{4}-\d{2}-\d{2}$', part):
                    report_date = part
                    break
            # Fallback: extract date from filename YYYY-MM-DD.md
            if report_date == 'unknown':
                filename = relative_path.split('/')[-1]
                m = re.match(r'(\d{4}-\d{2}-\d{2})', filename)
                if m:
                    report_date = m.group(1)
            if report_date not in self.daily_reports:
                self.daily_reports[report_date] = []
            self.daily_reports[report_date].append(doc)

        # 每日報告偵測（fallback）：不在每日報告/ 下但檔名 YYYY-MM-DD 的追蹤日誌
        # 例如：市場情緒/YYYY-MM-DD.md 或產業洞察/*/追蹤日誌/YYYY-MM-DD.md
        if category == 'general' or category == 'industry':
            filename = relative_path.split('/')[-1]
            if re.match(r'^\d{4}-\d{2}-\d{2}\.md$', filename):
                if '市場情緒' in relative_path or '追蹤日誌' in relative_path:
                    report_date = filename.replace('.md', '')
                    if report_date not in self.daily_reports:
                        self.daily_reports[report_date] = []
                    self.daily_reports[report_date].append(doc)

        if category == 'industry':
            # ONLY files under Deep32Q知識庫/產業洞察/SUBDIR/... are valid industry entries
            # Files directly in 產業洞察/ (e.g. index.md) are skipped
            parts = relative_path.split('/')
            try:
                insight_index = parts.index('產業洞察')
                # Must have a subdirectory after 產業洞察: parts[insight_index + 1]
                # The subdirectory name IS the industry key (e.g. '功率離散元件研究')
                # It must be a directory name, not a filename
                if len(parts) > insight_index + 1:
                    sub = parts[insight_index + 1]
                    # skip if it is a file (ends with .md) → means no subdirectory
                    if not sub.endswith('.md'):
                        industry = sub
                        if industry not in self.industries:
                            self.industries[industry] = []
                        self.industries[industry].append(doc)
            except ValueError:
                pass  # not under 產業洞察 → skip

        elif category == 'audit':
            parts = relative_path.split('/')
            # relative_path = 審計報告庫/經營審計/4967_十銓/20260428/G14_xxx.md
            # parts: ['審計報告庫', '經營審計', '4967_十銓', '20260428', 'G14_xxx.md']
            if len(parts) >= 4:
                audit_type = parts[1]  # '經營審計' or '財務審計'
                stock_dir = parts[2]   # '4967_十銓'
                # Extract the date dir (YYYYMMDD)
                report_date_str = '99999999'  # fallback for sorting
                for p in parts:
                    if re.match(r'^\d{8}$', p):
                        report_date_str = p
                        break
                if stock_dir not in self.audit_reports:
                    self.audit_reports[stock_dir] = {
                        'documents': [],
                        'stock_code': '',
                        'reports': []
                    }
                # Extract stock code from dir name (first run)
                if not self.audit_reports[stock_dir]['stock_code']:
                    code_match = re.match(r'^(\d+)', stock_dir)
                    self.audit_reports[stock_dir]['stock_code'] = code_match.group(1) if code_match else stock_dir
                self.audit_reports[stock_dir]['documents'].append(doc)
                # Skip index.md (no date dir) — only add reports with a real date
                if report_date_str != '99999999':
                    self.audit_reports[stock_dir]['reports'].append({
                        'title': title,
                        'route': route,
                        'file': relative_path,
                        'audit_type': audit_type,      # 經營審計 or 財務審計
                        'date': report_date_str,        # YYYYMMDD for sorting
                    })

    def build_search_index(self) -> list:
        """Build searchable index (title and content)."""
        index = []
        for doc in self.documents:
            # Store first 500 chars of content for snippet
            snippet = doc['content'][:500]
            index.append({
                'id': doc['id'],
                'title': doc['title'],
                'route': doc['route'],
                'category': doc['category'],
                'summary': doc['summary'],
                'date': doc['date'],
                'words': doc['title'] + ' ' + doc['summary'],
            })
        return index


# ── Site Page Builders ────────────────────────────────────────

def build_home_page(index: IndexBuilder) -> str:
    """Build the main landing page — daily report timeline with inline accordion."""
    parts = []

    import html as html_mod

    # Sort dates descending
    sorted_dates = sorted(index.daily_reports.keys(), reverse=True)

    if not sorted_dates:
        parts.append('<div class="empty-state"><p>目前尚無每日報告。</p></div>')
    else:
        for i, report_date in enumerate(sorted_dates):
            expanded = ' expanded' if i == 0 else ''
            parts.append(f'<div class="timeline-day{expanded}" data-date="{report_date}">')
            parts.append(f'<div class="timeline-day-toggle">{report_date} <span class="timeline-arrow">▶</span></div>')
            parts.append('<div class="timeline-reports">')
            for doc in index.daily_reports[report_date]:
                # Convert content to inline HTML
                content_html = md_to_html(doc['content'])
                title = doc['title']
                # Escape title for safe HTML
                safe_title = html_mod.escape(title) if title else '未命名報告'
                parts.append('<div class="timeline-report">')
                parts.append(f'''
                <div class="report-header">
                    <span class="report-arrow">▼</span>
                    <span class="report-title">{safe_title}</span>
                </div>
                <div class="report-body"><template class="report-body-template">{content_html}</template></div>
                ''')
                parts.append('</div>')
            parts.append('</div></div>')

    return '\n'.join(parts)


def build_industries_page(index: IndexBuilder) -> str:
    """Build the industry insights listing page (collapsible sections).
    
    Only subdirectories under 產業洞察/ are valid industries.
    Files directly in 產業洞察/ (e.g. index.md) are already excluded in add_document.
    Within each industry, reports are sorted by date (newest first).
    """
    import html as html_mod
    parts = ['<div class="page-container industries-page">']
    parts.append('<h1>產業洞察</h1>')

    # Sort industries by their latest report date (newest first)
    def _latest_date(industry_name: str) -> str:
        docs = index.industries[industry_name]
        dates = [d.get('date', '') for d in docs]
        return max(dates) if dates else '1970-01-01'
    
    sorted_industries = sorted(index.industries.keys(), key=_latest_date, reverse=True)

    for industry in sorted_industries:
        docs = index.industries[industry]
        # Sort reports within industry by date (newest first)
        sorted_docs = sorted(docs, key=lambda d: d.get('date', ''), reverse=True)
        
        safe_name = html_mod.escape(industry)
        parts.append(f'<div class="industry-section">')
        parts.append(f'''
        <div class="industry-header" data-toggle="industry">
            <span class="industry-arrow">▼</span>
            <span class="industry-name">{safe_name}</span>
            <span class="industry-count">{len(sorted_docs)} 份報告</span>
        </div>
        ''')
        parts.append('<div class="industry-body"><div class="industry-body-inner">')
        parts.append('<ul class="report-list">')
        for doc in sorted_docs:
            safe_title = html_mod.escape(doc['title'])
            parts.append(f'''
            <li class="report-item">
                <a href="/?p=report&f={doc['route']}" class="report-link">{safe_title}</a>
                <span class="report-date">{doc['date']}</span>
            </li>
            ''')
        parts.append('</ul>')
        parts.append('</div></div>')
        parts.append('</div>')

    parts.append('</div>')
    return '\n'.join(parts)


def build_audit_page(index: IndexBuilder) -> str:
    """Build the audit reports stock listing page.
    
    Structure:
      stock_code (by latest report date)
        ├── 經營組 (collapsible)
        │   ├── report (sorted by date)
        │   └── ...
        └── 財務組 (collapsible)
            ├── report (sorted by date)
            └── ...
    """
    import html as html_mod
    
    parts = ['<div class="page-container audit-page">']
    parts.append('<h1>審計報告</h1>')
    parts.append('<div class="audit-filter-wrap"><input type="text" id="audit-filter" placeholder="搜尋股票代碼或名稱…"></div>')
    parts.append('<div class="audit-list">')

    # Build stock groups — each stock has 經營組 and 財務組 reports
    stock_groups = {}
    
    for stock_dir, info in index.audit_reports.items():
        code = info.get('stock_code', '')
        # Extract company name from stock_dir (e.g. '4967_十銓')
        company = ''
        if '_' in stock_dir and code:
            company = stock_dir[len(code):].lstrip('_- ')
        elif not company:
            company = stock_dir
        
        if code not in stock_groups:
            stock_groups[code] = {
                'code': code,
                'company': company,
                'latest_date': '',
                'management': [],  # 經營審計
                'financial': [],   # 財務審計
            }
        
        for report_doc in info.get('reports', []):
            audit_type = report_doc.get('audit_type', '')
            report_date = report_doc.get('date', '99999999')
            
            # Track latest date across all reports for this stock
            if report_date > stock_groups[code]['latest_date']:
                stock_groups[code]['latest_date'] = report_date
            
            if audit_type == '經營審計':
                stock_groups[code]['management'].append(report_doc)
            elif audit_type == '財務審計':
                stock_groups[code]['financial'].append(report_doc)

    # Sort stocks by latest report date (newest first)
    sorted_stocks = sorted(
        stock_groups.values(),
        key=lambda g: g['latest_date'],
        reverse=True
    )

    for group in sorted_stocks:
        code = group['code']
        safe_company = html_mod.escape(group['company'] if group['company'] else code)
        total_count = len(group['management']) + len(group['financial'])
        search_text = f'{code} {group["company"]}'
        
        # Sort reports within each type by date (newest first)
        group['management'].sort(key=lambda r: r.get('date', '99999999'), reverse=True)
        group['financial'].sort(key=lambda r: r.get('date', '99999999'), reverse=True)
        
        parts.append(f'<div class="audit-stock-item" data-search="{search_text}">')
        parts.append(f'''
        <div class="audit-stock-header" data-toggle="audit">
            <span class="audit-arrow">▼</span>
            <span class="audit-stock-code">{code}</span>
            <span class="audit-stock-name">{safe_company}</span>
            <span class="audit-stock-count">{total_count} 題</span>
        </div>
        ''')
        parts.append('<div class="audit-stock-body">')
        
        # 經營組
        mgmt_count = len(group['management'])
        if mgmt_count > 0:
            parts.append(f'<div class="audit-type-section">')
            parts.append(f'''
            <div class="audit-type-header" data-toggle="audit-type">
                <span class="audit-type-arrow">▶</span>
                <span class="audit-type-label">經營組</span>
                <span class="audit-type-count">{mgmt_count} 份</span>
            </div>
            ''')
            parts.append('<div class="audit-type-body"><ul class="audit-report-list">')
            for report in group['management']:
                safe_r_title = html_mod.escape(report.get('title', '未命名'))
                parts.append(f'''
                <li class="audit-report-item">
                    <a href="/?p=report&f={report['route']}" class="audit-report-link">{safe_r_title}</a>
                    <span class="audit-report-date">{report.get('date', '')}</span>
                </li>
                ''')
            parts.append('</ul></div></div>')
        
        # 財務組
        fin_count = len(group['financial'])
        if fin_count > 0:
            parts.append(f'<div class="audit-type-section">')
            parts.append(f'''
            <div class="audit-type-header" data-toggle="audit-type">
                <span class="audit-type-arrow">▶</span>
                <span class="audit-type-label">財務組</span>
                <span class="audit-type-count">{fin_count} 份</span>
            </div>
            ''')
            parts.append('<div class="audit-type-body"><ul class="audit-report-list">')
            for report in group['financial']:
                safe_r_title = html_mod.escape(report.get('title', '未命名'))
                parts.append(f'''
                <li class="audit-report-item">
                    <a href="/?p=report&f={report['route']}" class="audit-report-link">{safe_r_title}</a>
                    <span class="audit-report-date">{report.get('date', '')}</span>
                </li>
                ''')
            parts.append('</ul></div></div>')
        
        parts.append('</div></div>')

    parts.append('</div></div>')
    return '\n'.join(parts)


def build_report_content_page(filepath: str, relative_path: str, index: IndexBuilder) -> str:
    """Build a single report content page."""
    try:
        content = Path(filepath).read_text(encoding='utf-8')
    except:
        return '<div class="error">無法讀取文件</div>'

    html_content = md_to_html(content)

    # Determine back link
    parts_html = [f'<div class="report-content-page">']

    # Breadcrumb
    p = relative_path.replace('\\', '/')
    parent_link = '/'
    parent_name = '首頁'
    if p.startswith('產業洞察/'):
        parent_link = '/?p=industries'
        parent_name = '產業洞察'
    elif p.startswith('審計報告庫/'):
        parent_link = '/?p=audit'
        parent_name = '審計報告'

    parts_html.append(f'<div class="breadcrumb"><a href="{parent_link}">← 回{parent_name}</a> / {p}</div>')
    parts_html.append(f'<div class="report-content">{html_content}</div>')
    parts_html.append('</div>')

    return '\n'.join(parts_html)


# ── Main Build ────────────────────────────────────────────────

def build_site():
    print("=== Deep32Q Site Builder ===")
    print(f"Repo root: {REPO_ROOT}")
    print(f"Output:    {SITE_ROOT}")

    # Clean and recreate output
    if SITE_ROOT.exists():
        shutil.rmtree(SITE_ROOT)
    SITE_ROOT.mkdir(parents=True)

    index = IndexBuilder()

    # Step 1: Scan all .md files
    md_files = []
    for root, dirs, files in os.walk(KB_DIR):
        # Skip hidden dirs
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for f in files:
            if f.endswith('.md'):
                full = Path(root) / f
                rel = full.relative_to(KB_DIR).as_posix()
                md_files.append((full, f'Deep32Q知識庫/{rel}'))

    # Also scan audit report dir
    for root, dirs, files in os.walk(AR_DIR):
        dirs[:] = [d for d in dirs if not d.startswith('.')]
        for f in files:
            if f.endswith('.md'):
                full = Path(root) / f
                rel = full.relative_to(AR_DIR).as_posix()
                md_files.append((full, f'審計報告庫/{rel}'))

    print(f"Found {len(md_files)} markdown files")

    # Step 2: Index all documents
    for full, rel in md_files:
        index.add_document(full, rel)

    print(f"  -> {len(index.documents)} indexed")

    # Step 3: Build search index
    search_index = index.build_search_index()
    print(f"  -> Search index: {len(search_index)} entries")

    # Step 4: Build static pages
    pages = {}

    # Home page (daily reports)
    home_body = build_home_page(index)
    home_html = INDEX_HTML_TEMPLATE.format(
        title=f"首頁 — {SITE_TITLE}",
        body_html=home_body
    )
    pages['index.html'] = home_html

    # Pre-build all report content pages (stored as fragments)
    report_pages = {}
    for full, rel in md_files:
        content_html = build_report_content_page(str(full), rel, index)
        # Store by route
        route = rel.replace('.md', '')
        # Create HTML page
        page_title = extract_title(full.read_text(encoding='utf-8'))
        full_html = INDEX_HTML_TEMPLATE.format(
            title=f"{page_title} — {SITE_TITLE}",
            body_html=content_html
        )
        report_pages[route] = full_html

    # Step 5: Copy assets
    # Copy CNAME
    if CNAME_FILE.exists():
        shutil.copy2(CNAME_FILE, SITE_ROOT / 'CNAME')
        print("  -> CNAME copied")

    # Copy CSS
    css_src = BUILD_DIR / 'style.css'
    if css_src.exists():
        shutil.copy2(css_src, SITE_ROOT / 'style.css')
        print("  -> CSS copied")

    # Copy JS files
    for js_file in ['search.js', 'content.js']:
        js_src = BUILD_DIR / js_file
        if js_src.exists():
            shutil.copy2(js_src, SITE_ROOT / js_file)
            print(f"  -> {js_file} copied")

    # Step 6: Write pages
    for filename, html in pages.items():
        (SITE_ROOT / filename).write_text(html, encoding='utf-8')

    # Write report pages (one-per-file, under reports/)
    reports_dir = SITE_ROOT / 'reports'
    reports_dir.mkdir(exist_ok=True)

    # json map for content.js
    route_map = {}
    import hashlib
    for route, html in report_pages.items():
        # Use MD5 hash filename (no Chinese chars) for GH Pages compatibility
        safe_name = hashlib.md5(route.encode()).hexdigest()[:12] + '.html'
        (reports_dir / safe_name).write_text(html, encoding='utf-8')
        route_map[route] = f'/reports/{safe_name}'

    # Step 7: Write navigation data (for client-side routing)
    nav_data = {
        'industries': {k: [{ 'title': d['title'],
                             'route': d['route'],
                             'date': d['date'] }
                          for d in v]
                       for k, v in index.industries.items()},
        'audit': {k: { 'stock_code': v.get('stock_code', ''),
                        'title': k,
                        'documents': len(v['documents']),
                        'reports': v.get('reports', []) }
                   for k, v in index.audit_reports.items()},
    }
    (SITE_ROOT / 'nav.json').write_text(json.dumps(nav_data, ensure_ascii=False), encoding='utf-8')

    # Step 8: Write search index
    (SITE_ROOT / 'search_index.json').write_text(
        json.dumps(search_index, ensure_ascii=False), encoding='utf-8'
    )

    # Step 9: Write route map (HTML fragments, not paths — GH Pages doesn't serve Chinese filenames)
    (SITE_ROOT / 'route_map.json').write_text(
        json.dumps(route_map, ensure_ascii=False), encoding='utf-8'
    )

    # Step 10: Copy admin files (whitelist management panel)
    admin_src = REPO_ROOT / 'admin'
    if admin_src.is_dir():
        for fname in ['index.html', 'whitelist.js']:
            src = admin_src / fname
            if src.exists():
                dst = SITE_ROOT / 'admin' / fname
                dst.parent.mkdir(parents=True, exist_ok=True)
                dst.write_bytes(src.read_bytes())
                print(f"  Copied admin/{fname} -> _site/admin/{fname}")

    print(f"\n=== Build complete ===")
    print(f"Site generated: {SITE_ROOT}")
    print(f"Total files:    {sum(len(files) for _, _, files in os.walk(SITE_ROOT))}")


if __name__ == '__main__':
    build_site()
