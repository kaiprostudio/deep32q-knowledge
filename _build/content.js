/**
 * Deep32Q 內容路由器 v2
 * SPA 路由 + 手風琴式展開（每日報告、產業洞察、審計報告）
 */
(function() {
    'use strict';

    let routeMap = {};
    let navData = {};

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

        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(el => el.classList.remove('active'));
        const navMap = { 'home': 'daily', 'industries': 'industries', 'audit': 'audit', 'report': 'daily' };
        const activeNav = navMap[page];
        if (activeNav) {
            const navEl = document.querySelector(`[data-nav="${activeNav}"]`);
            if (navEl) navEl.classList.add('active');
        }

        // Fade transition
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

        // Fallback: home
        window.location.href = '/';
    }

    /* ── 每日報告 — 首頁手風琴（問題 4 修復） ── */
    function bindDailyToggles() {
        // 日期收折
        document.querySelectorAll('.timeline-day-toggle').forEach(toggle => {
            toggle.addEventListener('click', function() {
                const day = this.closest('.timeline-day');
                if (day) day.classList.toggle('expanded');
            });
        });

        // 報告展開/收合（同頁面，不跳轉）
        document.querySelectorAll('.report-header').forEach(header => {
            header.addEventListener('click', function() {
                // Toggle this report
                const wasExpanded = this.classList.contains('expanded');
                // Close all others in the same timeline-day
                this.closest('.timeline-day').querySelectorAll('.report-header.expanded').forEach(h => {
                    if (h !== this) h.classList.remove('expanded');
                });
                if (wasExpanded) {
                    this.classList.remove('expanded');
                } else {
                    this.classList.add('expanded');
                }
            });
        });
    }

    /* ── 產業洞察（問題 2 修復 — 收折） ────────── */
    function renderIndustries(container) {
        let html = '<div class="page-container industries-page"><h1>產業洞察</h1>';

        // 過濾掉供應鏈拆解（問題 1 修復）
        const sortedIndustries = Object.keys(navData.industries || {})
            .filter(name => name !== '供應鏈拆解')
            .sort();

        if (sortedIndustries.length === 0) {
            html += '<div class="empty-state"><p>尚無產業洞察內容。</p></div>';
        } else {
            for (const industry of sortedIndustries) {
                const docs = navData.industries[industry];
                html += `<div class="industry-section">`;
                html += `<div class="industry-header" data-toggle="industry">`;
                html += `<span class="industry-arrow">▼</span>`;
                html += `<span class="industry-name">${industry}</span>`;
                html += `<span class="industry-count">${docs.length} 份報告</span>`;
                html += `</div>`;
                html += `<div class="industry-body"><div class="industry-body-inner">`;
                html += '<ul class="report-list">';
                for (const doc of docs) {
                    html += `<li class="report-item">
                        <a href="/?p=report&f=${encodeURIComponent(doc.route)}" class="report-link">${doc.title}</a>
                        <span class="report-date">${doc.date}</span>
                    </li>`;
                }
                html += '</ul></div></div></div>';
            }
        }

        html += '</div>';
        container.innerHTML = html;
        container.style.opacity = '1';

        // 綁定產業收折（問題 2）
        container.querySelectorAll('[data-toggle="industry"]').forEach(header => {
            header.addEventListener('click', function() {
                const wasExpanded = this.classList.contains('expanded');
                // Close all others
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

        // 預設展開第一個
        const first = container.querySelector('[data-toggle="industry"]');
        if (first) first.classList.add('expanded');
    }

    /* ── 審計報告（問題 3 修復 — 可點擊、搜尋） ─── */
    function renderAudit(container) {
        let html = '<div class="page-container audit-page"><h1>審計報告</h1>';
        html += '<div class="audit-filter-wrap"><input type="text" id="audit-filter" placeholder="搜尋股票代碼或名稱…"></div>';
        html += '<div class="audit-list" id="audit-list">';

        const sorted = Object.keys(navData.audit || {}).sort();
        for (const key of sorted) {
            const info = navData.audit[key];
            const code = info.stock_code || '';
            const title = info.title || key;
            const reports = info.reports || [];
            const count = reports.length;

            html += `<div class="audit-stock-item" data-search="${code} ${title}">`;
            html += `<div class="audit-stock-header" data-toggle="audit">`;
            html += `<span class="audit-arrow">▼</span>`;
            html += `<span class="audit-stock-code">${code}</span>`;
            html += `<span class="audit-stock-name">${title}</span>`;
            // 用子目錄名稱當顯示
            const dirName = key.replace(code, '').replace(/^[-_\s]+/, '').trim();
            html += `<span class="audit-stock-count">${count}</span>`;
            html += `</div>`;
            html += `<div class="audit-stock-body"><ul class="audit-report-list">`;
            // 顯示該股所有報告題目
            for (const report of reports) {
                const rPath = report.file || '';
                const rTitle = report.title || '未命名';
                html += `<li class="audit-report-item">
                    <a href="/?p=report&f=${encodeURIComponent(report.route)}" class="audit-report-link">${rTitle}</a>
                    <span class="audit-report-dir">${rPath.split('/')[2] || ''}</span>
                </li>`;
            }
            html += `</ul></div></div>`;
        }

        html += '</div></div>';
        container.innerHTML = html;
        container.style.opacity = '1';

        // 綁定審計收折
        container.querySelectorAll('[data-toggle="audit"]').forEach(header => {
            header.addEventListener('click', function() {
                const wasExpanded = this.classList.contains('expanded');
                // Close all others
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

        // 搜尋過濾（即時、大小寫不分）
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

    // Init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
