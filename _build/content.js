/**
 * Deep32Q 內容路由器
 * 處理 SPA 頁面切換（URL query string 路由）
 */
(function() {
    'use strict';

    let routeMap = {};
    let navData = {};

    function init() {
        // Load route map
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

        // Handle browser back/forward
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
        const navMap = { 'home': 'daily', 'industries': 'industries', 'audit': 'audit', 'report': null };
        const activeNav = navMap[page];
        if (activeNav) {
            const navEl = document.querySelector(`[data-nav="${activeNav}"]`);
            if (navEl) navEl.classList.add('active');
        }

        mainEl.style.opacity = '0.4';
        mainEl.style.transition = 'opacity 0.15s';

        if (page === 'home') {
            // Home page already loaded from server; just ensure scroll
            window.scrollTo(0, 0);
            mainEl.style.opacity = '1';
            // Re-bind timeline toggles
            bindTimelineToggles();
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

        if (page === 'report' && file) {
            loadReport(mainEl, file);
            return;
        }

        // Fallback: home
        window.location.href = '/';
    }

    function renderIndustries(container) {
        let html = '<div class="page-container industries-page"><h1>產業洞察</h1>';

        const sortedIndustries = Object.keys(navData.industries || {}).sort();
        if (sortedIndustries.length === 0) {
            html += '<div class="empty-state"><p>尚無產業洞察內容。</p></div>';
        } else {
            for (const industry of sortedIndustries) {
                const docs = navData.industries[industry];
                html += `<div class="industry-section">`;
                html += `<h2 class="industry-name">${industry}</h2>`;
                html += `<p class="industry-count">${docs.length} 份報告</p>`;
                html += '<ul class="report-list">';
                for (const doc of docs) {
                    html += `<li class="report-item">
                        <a href="/?p=report&f=${encodeURIComponent(doc.route)}" class="report-link">${doc.title}</a>
                        <span class="report-date">${doc.date}</span>
                    </li>`;
                }
                html += '</ul></div>';
            }
        }

        html += '</div>';
        container.innerHTML = html;
        container.style.opacity = '1';
    }

    function renderAudit(container) {
        let html = '<div class="page-container audit-page"><h1>審計報告</h1>';
        html += '<div class="audit-search"><input type="text" id="audit-filter" placeholder="搜尋股票代碼或名稱"></div>';
        html += '<table class="audit-table" id="audit-table"><thead><tr>';
        html += '<th>代碼</th><th>公司</th><th>子目錄</th><th>報告數</th>';
        html += '</tr></thead><tbody>';

        const sorted = Object.keys(navData.audit || {}).sort();
        for (const key of sorted) {
            const info = navData.audit[key];
            const code = info.stock_code || '';
            const title = info.title || key;
            const count = info.documents || 0;
            html += `<tr class="audit-row" data-stock="${key}">
                <td class="stock-code">${code}</td>
                <td class="stock-name">${title}</td>
                <td class="stock-dir">${key}</td>
                <td class="stock-count">${count}</td>
            </tr>`;
        }

        html += '</tbody></table></div>';
        container.innerHTML = html;
        container.style.opacity = '1';

        // Bind audit row clicks
        container.querySelectorAll('.audit-row').forEach(row => {
            row.addEventListener('click', function() {
                const stock = this.getAttribute('data-stock');
                // Audit reports not fully implemented in SPA routing yet;
                // for now just show a message
                alert('個股報告頁面待建置 — ' + stock);
            });
        });

        // Bind filter
        const filter = document.getElementById('audit-filter');
        if (filter) {
            filter.addEventListener('input', function() {
                const val = this.value.toLowerCase();
                container.querySelectorAll('.audit-row').forEach(row => {
                    const text = row.textContent.toLowerCase();
                    row.style.display = text.includes(val) ? '' : 'none';
                });
            });
        }
    }

    function loadReport(container, fileRoute) {
        const htmlPath = routeMap[fileRoute];

        if (!htmlPath) {
            container.innerHTML = '<div class="error">找不到此報告</div>';
            container.style.opacity = '1';
            return;
        }

        // Fetch the pre-built HTML page and extract body content
        fetch(htmlPath)
            .then(r => {
                if (!r.ok) throw new Error('Not found');
                return r.text();
            })
            .then(html => {
                // Extract everything inside #main-content from the report page
                const parser = new DOMParser();
                const doc = parser.parseFromString(html, 'text/html');
                const content = doc.getElementById('main-content');
                if (content) {
                    container.innerHTML = content.innerHTML;
                } else {
                    container.innerHTML = html;
                }
                container.style.opacity = '1';
                window.scrollTo(0, 0);
            })
            .catch(() => {
                container.innerHTML = '<div class="error">無法載入報告內容</div>';
                container.style.opacity = '1';
            });
    }

    function bindTimelineToggles() {
        document.querySelectorAll('.timeline-day-toggle').forEach(toggle => {
            toggle.addEventListener('click', function() {
                const day = this.closest('.timeline-day');
                if (day) {
                    day.classList.toggle('expanded');
                }
            });
        });

        document.querySelectorAll('.read-more-btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.stopPropagation();
                const route = this.getAttribute('data-route');
                if (route) {
                    navigateToReport(route);
                }
            });
        });

        document.querySelectorAll('.report-title').forEach(title => {
            title.addEventListener('click', function() {
                const route = this.closest('.report-summary')?.getAttribute('data-route');
                if (route) {
                    navigateToReport(route);
                }
            });
        });
    }

    function navigateToReport(route) {
        window.location.href = '/?p=report&f=' + encodeURIComponent(route);
    }

    // Init
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Expose for hash-based navigation compatibility
    window.routeTo = function(page, file) {
        const params = new URLSearchParams();
        if (page) params.set('p', page);
        if (file) params.set('f', file);
        const url = '/?' + params.toString();
        history.pushState({}, '', url);
        handleRoute();
    };
})();
