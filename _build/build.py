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
<link rel="stylesheet" href="/style.css">
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
      </div>
    </div>
  </nav>
  <main id="main-content">{body_html}</main>
</div>
<script src="/search.js"></script>
<script src="/content.js"></script>
</body>
</html>
"""


# ── Markdown to HTML (simple converter using stdlib) ───────────

def md_to_html(text: str) -> str:
    """Convert minimal Markdown to HTML using Python's standard library."""
    try:
        import markdown
        return markdown.markdown(
            text,
            extensions=['fenced_code', 'tables', 'codehilite', 'nl2br', 'sane_lists']
        )
    except ImportError:
        pass

    # Fallback: simple inline parser
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
    if p.startswith('每日報告/'):
        return 'daily'
    if p.startswith('產業洞察/'):
        return 'industry'
    if p.startswith('供應鏈拆解/'):
        return 'industry'  # merge into industry category
    return 'general'


def determine_category_by_route(route: str) -> str:
    """Determine category from the full route path (includes KB_DIR prefix)."""
    p = route.replace('\\', '/')
    if '每日報告' in p:
        return 'daily'
    if '審計報告庫' in p:
        return 'audit'
    if '產業洞察' in p or '供應鏈拆解' in p:
        return 'industry'
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
            # Daily reports are always in 每日報告/YYYY-MM-DD/ format
            # relative_path includes KB dir prefix (Deep32Q知識庫/每日報告/YYYY-MM-DD/file.md)
            # or just (每日報告/YYYY-MM-DD/file.md) depending on source
            # Find the date part: looks for 4digits-2digits-2digits
            report_date = 'unknown'
            for part in date_part:
                if re.match(r'^\d{4}-\d{2}-\d{2}$', part):
                    report_date = part
                    break
            if report_date not in self.daily_reports:
                self.daily_reports[report_date] = []
            self.daily_reports[report_date].append(doc)

        elif category == 'industry':
            parts = relative_path.split('/')
            industry = parts[1] if len(parts) > 1 else '其他'
            if industry not in self.industries:
                self.industries[industry] = []
            self.industries[industry].append(doc)

        elif relative_path.startswith('審計報告庫/'):
            parts = relative_path.split('/')
            if len(parts) >= 3:
                stock_dir = parts[1]
                report_name = parts[2].replace('.md', '')
                if stock_dir not in self.audit_reports:
                    self.audit_reports[stock_dir] = {'documents': [], 'reports': []}
                # Extract stock code from dir name
                code_match = re.match(r'^(\d+)', stock_dir)
                stock_code = code_match.group(1) if code_match else stock_dir
                self.audit_reports[stock_dir]['stock_code'] = stock_code
                self.audit_reports[stock_dir]['documents'].append(doc)
                self.audit_reports[stock_dir]['reports'].append({
                    'title': title,
                    'route': route,
                    'file': relative_path,
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
    """Build the main landing page — daily report timeline."""
    parts = []

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
                parts.append('<div class="timeline-report">')
                # Summary
                summary = doc['summary']
                parts.append(f'''
                <div class="report-summary" data-route="{doc['route']}">
                    <span class="report-title">{doc['title']}</span>
                    <p class="report-summary-text">{summary}</p>
                    <button class="read-more-btn" data-route="{doc['route']}">閱讀全文</button>
                </div>
                ''')
                parts.append('</div>')
            parts.append('</div></div>')

    return '\n'.join(parts)


def build_industries_page(index: IndexBuilder) -> str:
    """Build the industry insights listing page."""
    parts = ['<div class="page-container industries-page">']
    parts.append('<h1>產業洞察</h1>')

    sorted_industries = sorted(index.industries.keys())

    for industry in sorted_industries:
        docs = index.industries[industry]
        parts.append(f'<div class="industry-section">')
        parts.append(f'<h2 class="industry-name">{industry}</h2>')
        parts.append(f'<p class="industry-count">{len(docs)} 份報告</p>')
        parts.append('<ul class="report-list">')
        for doc in docs:
            parts.append(f'''
            <li class="report-item">
                <a href="/?p=report&f={doc['route']}" class="report-link">{doc['title']}</a>
                <span class="report-date">{doc['date']}</span>
            </li>
            ''')
        parts.append('</ul>')
        parts.append('</div>')

    parts.append('</div>')
    return '\n'.join(parts)


def build_audit_page(index: IndexBuilder) -> str:
    """Build the audit reports stock listing page."""
    parts = ['<div class="page-container audit-page">']
    parts.append('<h1>審計報告</h1>')
    parts.append('<div class="audit-search"><input type="text" id="audit-filter" placeholder="搜尋股票代碼或名稱"></div>')
    parts.append('<table class="audit-table" id="audit-table">')
    parts.append('''
    <thead>
        <tr>
            <th>代碼</th>
            <th>公司</th>
            <th>子目錄</th>
            <th>報告數</th>
        </tr>
    </thead>
    <tbody>
    ''')

    sorted_stocks = sorted(index.audit_reports.keys(),
                           key=lambda x: index.audit_reports[x].get('stock_code', x))

    for stock_dir in sorted_stocks:
        info = index.audit_reports[stock_dir]
        # Split financial vs operating
        is_financial = '財務審計' in stock_dir or stock_dir.startswith('財務')
        report_count = len(info['documents'])
        parts.append(f'''
        <tr class="audit-row" data-stock="{stock_dir}">
            <td class="stock-code">{info.get('stock_code', '')}</td>
            <td class="stock-name">{stock_dir.split('_', 1)[1] if '_' in stock_dir else stock_dir}</td>
            <td class="stock-dir">{stock_dir}</td>
            <td class="stock-count">{report_count}</td>
        </tr>
        ''')
    parts.append('</tbody></table>')
    parts.append('</div>')
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
    for route, html in report_pages.items():
        # Save name: replace / with _
        safe_name = route.replace('/', '__') + '.html'
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
                        'documents': len(v['documents']) }
                   for k, v in index.audit_reports.items()},
    }
    (SITE_ROOT / 'nav.json').write_text(json.dumps(nav_data, ensure_ascii=False), encoding='utf-8')

    # Step 8: Write search index
    (SITE_ROOT / 'search_index.json').write_text(
        json.dumps(search_index, ensure_ascii=False), encoding='utf-8'
    )

    # Step 9: Write route map
    (SITE_ROOT / 'route_map.json').write_text(
        json.dumps(route_map, ensure_ascii=False), encoding='utf-8'
    )

    print(f"\n=== Build complete ===")
    print(f"Site generated: {SITE_ROOT}")
    print(f"Total files:    {sum(len(files) for _, _, files in os.walk(SITE_ROOT))}")


if __name__ == '__main__':
    build_site()
