/**
 * Deep32Q 內容路由器 v3
 * SPA 路由 + 手風琴式展開
 * 審計：股票 → 經營組/財務組 兩層 accordion
 * 產業：預設摺疊，按最新報告日期排序
 */
(function() {
    'use strict';

    let routeMap = {};
    let navData = {};
    const navMapDefault = { 'home': 'daily', 'industries': 'industries', 'audit': 'audit', 'report': 'daily' };

    function init() {
        Promise.all([
            fetch('/route_map.json').then(r => r.json()),
            fetch('/nav.json').then(r => r.json())
        ]).then(([routes, nav]) => {
            routeMap = routes;
            navData = nav;
            handleRoute();
        }).catch(err => {
            console.error('Failed to load navigation data:', err);
        });

        window.addEventListener('popstate', handleRoute);
    }

    function handleRoute() {
        const params = new URLSearchParams(window.location.search);
        const page = params.get('p') || 'home';
        const file = params.get('f');

        const mainEl = document.getElementById('main-content');
        if (!mainEl) return;

        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        // navMap 定義各 page 對應的 navbar active 狀態
        // report 頁面根據路徑判斷來源，不要固定高亮每日報告
        let activeNav = navMapDefault[page] || null;
        if (page === 'report' && file) {
            if (file.startsWith('審計報告庫/')) activeNav = 'audit';
            else if (file.startsWith('Deep32Q知識庫/產業洞察/')) activeNav = 'industries';
            else activeNav = 'daily';
        }
        if (activeNav) {
            const navEl = document.querySelector(`[data-nav="${activeNav}"]`);
            if (navEl) navEl.classList.add('active');
        }

        mainEl.style.opacity = '0.4';
        mainEl.style.transition = 'opacity 0.15s';

        if (page === 'home') {
            window.scrollTo(0, 0);
            mainEl.style.opacity = '1';
            bindDailyToggles();
            return;
        }

        if (page === 'industries') {
            renderIndustries(mainEl);
            return;
        }

        if (page === 'audit') {
            renderAudit(mainEl);
            return;
        }

        if (page === 'report') {
            renderReport(mainEl, file);
            return;
        }

        window.location.href = '/';
    }

    /* ── 每日報告 ── */
    function bindDailyToggles() {
        document.querySelectorAll('.timeline-day-toggle').forEach(toggle => {
            toggle.addEventListener('click', function() {
                const day = this.closest('.timeline-day');
                if (day) day.classList.toggle('expanded');
            });
        });

        document.querySelectorAll('.report-header').forEach(header => {
            header.addEventListener('click', function() {
                const wasExpanded = this.classList.contains('expanded');
                this.closest('.timeline-day').querySelectorAll('.report-header.expanded').forEach(h => {
                    if (h !== this) h.classList.remove('expanded');
                });
                if (wasExpanded) {
                    this.classList.remove('expanded');
                } else {
                    this.classList.add('expanded');
                }
                // If using <template>, extract content on first expand
                const body = this.nextElementSibling;
                if (body && body.classList.contains('report-body')) {
                    const tmpl = body.querySelector('.report-body-template');
                    if (tmpl && tmpl.content) {
                        // Clone template content and swap
                        const clone = document.createElement('div');
                        clone.className = 'report-body-inner';
                        clone.appendChild(tmpl.content.cloneNode(true));
                        tmpl.replaceWith(clone);
                    }
                }
            }, { once: true });
        });
    }

    /* ── 產業洞察（從 navData 渲染 + 手風琴） ── */
    function renderIndustries(container) {
        let html = '<div class="page-container industries-page"><h1>產業洞察</h1>';

        const industries = navData.industries || {};
        const keys = Object.keys(industries);

        if (keys.length === 0) {
            html += '<div class="empty-state"><p>尚無產業洞察內容。</p></div>';
        } else {
            // Sort by latest report date (newest first)
            const sorted = keys.sort((a, b) => {
                const docsA = industries[a];
                const docsB = industries[b];
                const dateA = docsA.reduce((max, d) => d.date > max ? d.date : max, '');
                const dateB = docsB.reduce((max, d) => d.date > max ? d.date : max, '');
                return dateB.localeCompare(dateA);
            });

            for (const industry of sorted) {
                const docs = industries[industry];
                // Filter out index.md and SUMMARY.md (navigation files, not actual reports)
                const filtered = docs.filter(d => !d.route.endsWith('/index') && !d.route.endsWith('/SUMMARY'));
                // Sort: date descending (newest first), then filename ascending (01_ before 05_)
                // Using stable sort: first by filename, then by date descending
                const sortedDocs = filtered.slice()
                    .sort((a, b) => (a.route || a.title).localeCompare(b.route || b.title))
                    .sort((a, b) => b.date.localeCompare(a.date));
                html += `<div class="industry-section">`;
                html += `<div class="industry-header" data-toggle="industry">`;
                html += `<span class="industry-arrow">▶</span>`;
                html += `<span class="industry-name">${industry}</span>`;
                html += `<span class="industry-count">${sortedDocs.length} 份報告</span>`;
                html += `</div>`;
                html += `<div class="industry-body"><div class="industry-body-inner">`;
                html += '<ul class="report-list">';
                for (const doc of sortedDocs) {
                    html += `<li class="report-item">`;
                    html += `<a href="/?p=report&f=${encodeURIComponent(doc.route)}" class="report-link" data-route="${doc.route}">${doc.title}</a>`;
                    html += `<span class="report-date">${doc.date}</span>`;
                    html += `</li>`;
                }
                html += '</ul></div></div></div>';
            }
        }

        html += '</div>';
        container.innerHTML = html;
        container.style.opacity = '1';

        // Bind toggles
        container.querySelectorAll('[data-toggle="industry"]').forEach(header => {
            header.addEventListener('click', function() {
                const wasExpanded = this.classList.contains('expanded');
                container.querySelectorAll('[data-toggle="industry"].expanded').forEach(h => {
                    if (h !== this) h.classList.remove('expanded');
                });
                if (wasExpanded) {
                    this.classList.remove('expanded');
                } else {
                    this.classList.add('expanded');
                }
            });
        });
        // 產業洞察預設全部折疊（2026-06-20 周一要求）
        // 不再自動展開第一個產業

        // 產業洞察：點報告標題 → inline 展開報告內容（無跳轉、一頁式向下滾動）
        container.querySelectorAll('.report-link[data-route]').forEach(link => {
            // 防止多次繫結導致重複展開
            if (link.dataset.inlineBound) return;
            link.dataset.inlineBound = '1';
            link.addEventListener('click', async function(e) {
                e.preventDefault();
                const li = this.closest('.report-item');
                if (!li) return;
                // 檢查是否已展開，若已展開則收合
                const existing = li.querySelector('.inline-report-content');
                if (existing) {
                    existing.remove();
                    return;
                }
                const route = this.getAttribute('data-route');
                const htmlPath = routeMap[route];
                if (!htmlPath) return;
                try {
                    const resp = await fetch(htmlPath);
                    const html = await resp.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const reportContent = doc.querySelector('.report-content');
                    if (!reportContent) return;
                    const div = document.createElement('div');
                    div.className = 'inline-report-content';
                    div.innerHTML = reportContent.innerHTML;
                    li.appendChild(div);
                    // 展開後 Scroll 到報告開頭
                    div.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } catch(e) { /* silent */ }
            });
        });
    }

    /* ── 審計報告（從 navData 渲染 + 經營/財務兩層 accordion） ── */
    function renderAudit(container) {
        let html = '<div class="page-container audit-page"><h1>審計報告</h1>';
        html += '<div class="audit-filter-wrap"><input type="text" id="audit-filter" placeholder="搜尋股票代碼或名稱…"></div>';
        html += '<div class="audit-list" id="audit-list">';

        const auditData = navData.audit || {};
        const keys = Object.keys(auditData);

        if (keys.length === 0) {
            html += '<div class="empty-state"><p>尚無審計報告。</p></div>';
        } else {
            // Build stock groups: each stock has management & financial report arrays
            const stocks = {};
            for (const key of keys) {
                const info = auditData[key];
                const code = info.stock_code || '';
                const company = key.replace(code, '').replace(/^[-_\s]+/, '').trim();
                if (!stocks[code]) {
                    stocks[code] = { code, company, latest_date: '00000000', management: [], financial: [] };
                }
                const reports = info.reports || [];
                for (const r of reports) {
                    const rDate = r.date || '99999999';
                    if (rDate !== '99999999' && rDate > stocks[code].latest_date) stocks[code].latest_date = rDate;
                    if (r.audit_type === '經營審計') {
                        stocks[code].management.push(r);
                    } else if (r.audit_type === '財務審計') {
                        stocks[code].financial.push(r);
                    }
                }
            }

            // Sort stocks by latest report date (newest first)
            const sortedStocks = Object.values(stocks).sort((a, b) => b.latest_date.localeCompare(a.latest_date));

            for (const stock of sortedStocks) {
                const total = stock.management.length + stock.financial.length;
                const searchText = `${stock.code} ${stock.company}`;
                html += `<div class="audit-stock-item" data-search="${searchText}">`;
                html += `<div class="audit-stock-header" data-toggle="audit">`;
                html += `<span class="audit-arrow">▶</span>`;
                html += `<span class="audit-stock-code">${stock.code}</span>`;
                html += `<span class="audit-stock-name">${stock.company}</span>`;
                html += `<span class="audit-stock-count">${total} 題</span>`;
                html += `</div>`;
                html += `<div class="audit-stock-body">`;

                // 經營組：先按題號 G01→G02→...→G11 排序，同題號再按日期最新優先
                const mgmt = stock.management.sort((a, b) => {
                    const gA = (a.route || '').match(/G(\d+)/);
                    const gB = (b.route || '').match(/G(\d+)/);
                    const numA = gA ? parseInt(gA[1]) : 999;
                    const numB = gB ? parseInt(gB[1]) : 999;
                    if (numA !== numB) return numA - numB;
                    return (b.date || '99999999').localeCompare(a.date || '99999999');
                });
                if (mgmt.length > 0) {
                    html += `<div class="audit-type-section">`;
                    html += `<div class="audit-type-header" data-toggle="audit-type">`;
                    html += `<span class="audit-type-arrow">▶</span>`;
                    html += `<span class="audit-type-label">經營組</span>`;
                    html += `<span class="audit-type-count">${mgmt.length} 份</span>`;
                    html += `</div>`;
                    html += `<div class="audit-type-body"><ul class="audit-report-list">`;
                    for (const r of mgmt) {
                        html += `<li class="audit-report-item">`;
                        html += `<a href="/?p=report&f=${encodeURIComponent(r.route)}" class="audit-report-link" data-route="${r.route}">${r.title}</a>`;
                        html += `<span class="audit-report-date">${r.date}</span>`;
                        html += `</li>`;
                    }
                    html += `</ul></div></div>`;
                }

                // 財務組：先按題號 F01→F02→...→F18 排序，同題號再按日期最新優先
                const fin = stock.financial.sort((a, b) => {
                    const fA = (a.route || '').match(/F(\d+)/);
                    const fB = (b.route || '').match(/F(\d+)/);
                    const numA = fA ? parseInt(fA[1]) : 999;
                    const numB = fB ? parseInt(fB[1]) : 999;
                    if (numA !== numB) return numA - numB;
                    return (b.date || '99999999').localeCompare(a.date || '99999999');
                });
                if (fin.length > 0) {
                    html += `<div class="audit-type-section">`;
                    html += `<div class="audit-type-header" data-toggle="audit-type">`;
                    html += `<span class="audit-type-arrow">▶</span>`;
                    html += `<span class="audit-type-label">財務組</span>`;
                    html += `<span class="audit-type-count">${fin.length} 份</span>`;
                    html += `</div>`;
                    html += `<div class="audit-type-body"><ul class="audit-report-list">`;
                    for (const r of fin) {
                        html += `<li class="audit-report-item">`;
                        html += `<a href="/?p=report&f=${encodeURIComponent(r.route)}" class="audit-report-link" data-route="${r.route}">${r.title}</a>`;
                        html += `<span class="audit-report-date">${r.date}</span>`;
                        html += `</li>`;
                    }
                    html += `</ul></div></div>`;
                }

                html += `</div></div>`;
            }
        }

        html += '</div></div>';
        container.innerHTML = html;
        container.style.opacity = '1';

        // 第一層：股票 toggle
        container.querySelectorAll('[data-toggle="audit"]').forEach(header => {
            header.addEventListener('click', function() {
                const wasExpanded = this.classList.contains('expanded');
                container.querySelectorAll('[data-toggle="audit"].expanded').forEach(h => {
                    if (h !== this) h.classList.remove('expanded');
                });
                if (wasExpanded) {
                    this.classList.remove('expanded');
                } else {
                    this.classList.add('expanded');
                }
            });
        });

        // 第二層：經營/財務組 toggle（獨立，不互相影響）
        container.querySelectorAll('[data-toggle="audit-type"]').forEach(header => {
            header.addEventListener('click', function(e) {
                e.stopPropagation();
                this.classList.toggle('expanded');
            });
        });

        // 審計報告：點報告標題 → inline 展開報告內容（無跳轉、一頁式向下滾動）
        container.querySelectorAll('.report-link[data-route], .audit-report-link[data-route]').forEach(link => {
            if (link.dataset.inlineBound) return;
            link.dataset.inlineBound = '1';
            link.addEventListener('click', async function(e) {
                e.preventDefault();
                const li = this.closest('.report-item, .audit-report-item');
                if (!li) return;
                const existing = li.querySelector('.inline-report-content');
                if (existing) {
                    existing.remove();
                    return;
                }
                const route = this.getAttribute('data-route');
                const htmlPath = routeMap[route];
                if (!htmlPath) return;
                try {
                    const resp = await fetch(htmlPath);
                    const html = await resp.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const reportContent = doc.querySelector('.report-content');
                    if (!reportContent) return;
                    const div = document.createElement('div');
                    div.className = 'inline-report-content';
                    div.innerHTML = reportContent.innerHTML;
                    li.appendChild(div);
                    div.scrollIntoView({ behavior: 'smooth', block: 'start' });
                } catch(e) { /* silent */ }
            });
        });

        // 搜尋過濾
        const filter = document.getElementById('audit-filter');
        if (filter) {
            filter.addEventListener('input', function() {
                const val = this.value.toLowerCase().trim();
                const list = document.getElementById('audit-list');
                if (!list) return;
                list.querySelectorAll('.audit-stock-item').forEach(item => {
                    const searchText = (item.getAttribute('data-search') || item.textContent).toLowerCase();
                    item.style.display = val === '' || searchText.includes(val) ? '' : 'none';
                });
            });
        }
    }

    /* ── 報告內容頁 ── */
    function renderReport(container, filePath) {
        if (!filePath) {
            window.location.href = '/';
            return;
        }
        
        const htmlPath = routeMap[filePath];
        if (!htmlPath) {
            container.innerHTML = '<div class="page-container"><div class="error">無法找到此報告。</div></div>';
            container.style.opacity = '1';
            return;
        }
        
        // Determine back link based on path
        let backLink = '/';
        let backText = '回首頁';
        if (filePath.startsWith('審計報告庫/')) {
            backLink = '/?p=audit';
            backText = '回審計報告';
        } else if (filePath.startsWith('Deep32Q知識庫/產業洞察/')) {
            backLink = '/?p=industries';
            backText = '回產業洞察';
        }
        
        fetch(htmlPath)
            .then(r => {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.text();
            })
            .then(html => {
                // Parse the fetched HTML with a DOMParser to extract only the report content.
                // The report files are wrapped in INDEX_HTML_TEMPLATE (#app, #navbar, content.js).
                // Injecting <body> as innerHTML causes the browser to re-parse script tags,
                // which re-inits the SPA and resets the current page to home.
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                // Use .report-content (not .report-content-page) to skip breadcrumb div.
                // Outer container already has the '← 回' link; inner breadcrumb would duplicate it.
                const reportContent = doc.querySelector('.report-content');
                let bodyContent = reportContent ? reportContent.innerHTML : '<p>無法解析報告內容。</p>';
                container.innerHTML = `
                    <div class="page-container report-page">
                        <div class="report-back">
                            <a href="${backLink}" class="back-link">← ${backText}</a>
                        </div>
                        ${bodyContent}
                    </div>
                `;
                container.style.opacity = '1';
                window.scrollTo(0, 0);
            })
            .catch(err => {
                container.innerHTML = `<div class="page-container"><div class="error">報告載入失敗：${err.message}</div></div>`;
                container.style.opacity = '1';
            });
    }

    /* ── 深色模式切換 ── */
    function initTheme() {
        const saved = localStorage.getItem('deep32q-theme');
        if (saved === 'dark') {
            document.documentElement.setAttribute('data-theme', 'dark');
        }
        const toggle = document.getElementById('theme-toggle');
        if (toggle) {
            const updateIcon = () => {
                const theme = document.documentElement.getAttribute('data-theme') || 'light';
                toggle.textContent = theme === 'dark' ? '☀️' : '🌙';
            };
            updateIcon();
            toggle.addEventListener('click', function() {
                const current = document.documentElement.getAttribute('data-theme') || 'light';
                const next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                localStorage.setItem('deep32q-theme', next);
                updateIcon();
            });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => { init(); initTheme(); });
    } else {
        init();
        initTheme();
    }
})();
