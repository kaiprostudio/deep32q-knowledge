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

    function updateSearchScope(page, file) {
        // Hide navbar search box on all SPA pages.
        // Industries and Audit have their own embed search boxes.
        const wrap = document.getElementById('search-wrap');
        const input = document.getElementById('search-input');

        if (wrap) {
            wrap.style.display = 'none';
        }
        if (input) {
            const results = document.getElementById('search-results');
            if (results) results.classList.add('hidden');
        }
        document.documentElement.setAttribute('data-search-scope', 'all');
    }

    function handleRoute() {
        const params = new URLSearchParams(window.location.search);
        const page = params.get('p') || 'home';
        const file = params.get('f');

        const mainEl = document.getElementById('main-content');
        if (!mainEl) return;

        // Update search scope before rendering (so placeholder text is ready)
        updateSearchScope(page, file);

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
        let html = '<div class="page-container industries-page"><h1>產業洞察</h1><div class="industries-filter-wrap"><input type="text" id="industries-filter" placeholder="搜尋產業洞察報告…"></div>';

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
                for (const doc of sortedDocs) {
                    html += `<div class="timeline-report">`;
                    html += `<div class="report-header" data-report-route="${doc.route}">`;
                    html += `<span class="report-arrow">▸</span>`;
                    html += `<span class="report-title">${doc.title}</span>`;
                    html += `<span class="report-date">${doc.date}</span>`;
                    html += `</div>`;
                    html += `<div class="report-body"><template class="report-body-template"></template></div>`;
                    html += `</div>`;
                }
                html += '</div></div></div>';
            }
        }

        html += '</div>';
        container.innerHTML = html;
        container.style.opacity = '1';

        // 產業洞察內嵌搜尋框 — 全文檢索 + 浮動面板（含高亮關鍵字片段）
        const industriesFilter = document.getElementById('industries-filter');
        if (industriesFilter) {
            let industryIndex = null;
            function loadIndustryIndex() {
                if (industryIndex) return Promise.resolve(industryIndex);
                return fetch('/search_index.json')
                    .then(r => r.json())
                    .then(data => {
                        industryIndex = data.filter(d => d.page_scope === 'industry');
                        return industryIndex;
                    })
                    .catch(() => { industryIndex = []; return []; });
            }

            // Create floating panel
            let panel = document.createElement('div');
            panel.className = 'industry-search-panel';
            panel.style.cssText = 'display:none;position:absolute;top:100%;left:0;right:0;z-index:100;background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--radius-sm);max-height:420px;overflow-y:auto;box-shadow:var(--shadow-lg);margin-top:4px;';
            industriesFilter.parentElement.style.position = 'relative';
            industriesFilter.parentElement.appendChild(panel);

            function highlightText(text, keyword) {
                if (!keyword) return text;
                const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                const re = new RegExp('(' + escaped + ')', 'gi');
                return text.replace(re, '<mark style="background:#fbbf24;color:#1a1a2e;padding:0 2px;border-radius:2px">$1</mark>');
            }

            function extractSnippet(text, keyword, maxLen) {
                maxLen = maxLen || 120;
                const idx = text.toLowerCase().indexOf(keyword.toLowerCase());
                if (idx < 0) return text.substring(0, maxLen);
                const start = Math.max(0, idx - Math.floor((maxLen - keyword.length) / 2));
                let end = start + maxLen;
                if (end > text.length) {
                    end = text.length;
                }
                let snippet = text.substring(start, end);
                if (start > 0) snippet = '…' + snippet;
                if (end < text.length) snippet = snippet + '…';
                return snippet;
            }

            // Cache: route -> fetched body text (to avoid re-fetch on repeated searches)
            const bodyCache = {};

            async function fetchBodyText(route) {
                if (bodyCache[route]) return bodyCache[route];
                const htmlPath = routeMap[route];
                if (!htmlPath) return '';
                try {
                    const resp = await fetch(htmlPath);
                    const html = await resp.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, 'text/html');
                    const content = doc.querySelector('.report-content');
                    if (content) {
                        // Get plain text from body for snippet extraction
                        const text = content.textContent.replace(/\s+/g, ' ').trim();
                        bodyCache[route] = text;
                        return text;
                    }
                    bodyCache[route] = '';
                    return '';
                } catch(e) {
                    bodyCache[route] = '';
                    return '';
                }
            }

            function buildPanelEntry(doc, query, bodyText) {
                const hasBody = bodyText && bodyText.length > 50;
                const snippet = hasBody
                    ? extractSnippet(bodyText, query, 100)
                    : (doc.summary || doc.title);
                const highlightedSnippet = highlightText(snippet, query);
                const highlightedTitle = highlightText(doc.title || '', query);

                return '<div class="industry-search-result" data-route="' + doc.route + '" style="padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border-light);transition:background 0.15s">'
                    + '<div style="font-size:0.85rem;font-weight:500;color:var(--text);margin-bottom:3px">' + highlightedTitle + '</div>'
                    + '<div style="font-size:0.75rem;color:var(--text-secondary);line-height:1.4">' + highlightedSnippet + '</div>'
                    + '</div>';
            }

            let debounceTimer = null;
            industriesFilter.addEventListener('input', function() {
                clearTimeout(debounceTimer);
                const val = this.value.trim();
                if (val.length < 1) {
                    panel.style.display = 'none';
                    container.querySelectorAll('.industry-section').forEach(s => s.style.display = '');
                    return;
                }
                debounceTimer = setTimeout(() => {
                    loadIndustryIndex().then(async (industryDocs) => {
                        const query = val;
                        const queryLCWords = query.toLowerCase().split(/\s+/).filter(t => t.length > 0);

                        // Filter using index (lightweight)
                        const matched = [];
                        for (const doc of industryDocs) {
                            const searchText = ((doc.title||'') + ' ' + (doc.summary||'') + ' ' + (doc.words||'')).toLowerCase();
                            let allMatch = true;
                            for (const term of queryLCWords) {
                                if (!searchText.includes(term)) { allMatch = false; break; }
                            }
                            if (allMatch) matched.push(doc);
                        }

                        if (matched.length === 0) {
                            panel.innerHTML = '<div style="padding:12px 16px;color:var(--text-secondary);font-size:0.85rem">找不到符合「' + query + '」的報告</div>';
                            panel.style.display = '';
                            return;
                        }

                        // Build header
                        let html = '<div style="padding:8px 12px;font-size:0.78rem;color:var(--text-tertiary);border-bottom:1px solid var(--border)">找到 ' + matched.length + ' 份相關報告</div>';

                        // First 3: fetch full body for rich snippet
                        const top3 = matched.slice(0, 3);
                        for (const doc of top3) {
                            const bodyText = await fetchBodyText(doc.route);
                            html += buildPanelEntry(doc, query, bodyText);
                        }

                        // Rest: show title-only with lazy-load indicator
                        const rest = matched.slice(3);
                        if (rest.length > 0) {
                            html += '<div id="industry-search-more" style="padding:8px 12px;font-size:0.78rem;color:var(--text-tertiary);text-align:center;cursor:pointer;border-bottom:1px solid var(--border-light)">還有 ' + rest.length + ' 筆結果</div>';
                            for (const doc of rest) {
                                const title = highlightText(doc.title || '', query);
                                html += '<div class="industry-search-result industry-search-lazy" data-route="' + doc.route + '" style="display:none;padding:10px 16px;cursor:pointer;border-bottom:1px solid var(--border-light);transition:background 0.15s">'
                                    + '<div style="font-size:0.85rem;font-weight:500;color:var(--text)">' + title + '</div>'
                                    + '<div class="industry-search-snippet" style="font-size:0.75rem;color:var(--text-secondary);line-height:1.4">載入中…</div>'
                                    + '</div>';
                            }
                        }

                        panel.innerHTML = html;

                        // Bind click — all results: inline expand in place
                        panel.querySelectorAll('.industry-search-result').forEach(el => {
                            el.addEventListener('click', function() {
                                const route = this.getAttribute('data-route');
                                if (!route) return;
                                panel.style.display = 'none';
                                industriesFilter.value = '';
                                // Reset industry sections visibility
                                container.querySelectorAll('.industry-section').forEach(s => s.style.display = '');
                                container.querySelectorAll('.timeline-report').forEach(t => t.style.display = '');
                                // Find the matching report-header
                                const targetHeader = container.querySelector('.report-header[data-report-route="' + route.replace(/"/g, '&quot;') + '"]');
                                if (!targetHeader) {
                                    // Fallback: open full page
                                    window.location.href = '/?p=report&f=' + encodeURIComponent(route);
                                    return;
                                }
                                // Expand its parent industry section
                                const section = targetHeader.closest('.industry-section');
                                if (section) {
                                    const secHeader = section.querySelector('[data-toggle="industry"]');
                                    if (secHeader && !secHeader.classList.contains('expanded')) {
                                        secHeader.click();
                                    }
                                }
                                // Scroll to the target
                                targetHeader.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                // Click to expand the report
                                setTimeout(() => {
                                    targetHeader.click();
                                }, 350);
                            });
                        });

                        // Bind lazy load trigger: click "還有 N 筆" or scroll to bottom
                        const moreTrigger = document.getElementById('industry-search-more');
                        if (moreTrigger) {
                            let loadedLazy = false;
                            const loadLazy = async () => {
                                if (loadedLazy) return;
                                loadedLazy = true;
                                moreTrigger.style.display = 'none';
                                const lazyItems = panel.querySelectorAll('.industry-search-lazy');
                                for (let i = 0; i < lazyItems.length; i++) {
                                    const item = lazyItems[i];
                                    const route = item.getAttribute('data-route');
                                    const doc = matched.find(d => d.route === route);
                                    if (doc) {
                                        const bodyText = await fetchBodyText(route);
                                        const snippetEl = item.querySelector('.industry-search-snippet');
                                        if (snippetEl) {
                                            const hasBody = bodyText && bodyText.length > 50;
                                            const snippet = hasBody
                                                ? extractSnippet(bodyText, query, 100)
                                                : (doc.summary || doc.title);
                                            snippetEl.innerHTML = highlightText(snippet, query);
                                        }
                                    }
                                    item.style.display = '';
                                    // Small delay to avoid hammering
                                    await new Promise(r => setTimeout(r, 100));
                                }
                            };
                            moreTrigger.addEventListener('click', loadLazy);
                            // Also trigger lazy load when scrolling near bottom
                            panel.addEventListener('scroll', function() {
                                if (panel.scrollTop + panel.clientHeight >= panel.scrollHeight - 60) {
                                    loadLazy();
                                }
                            });
                        }

                        panel.style.display = '';
                    });
                }, 300); // debounce 300ms
            });

            // Close panel when clicking outside
            document.addEventListener('click', function(e) {
                if (!industriesFilter.parentElement.contains(e.target)) {
                    panel.style.display = 'none';
                }
            });

            // Close on Escape
            industriesFilter.addEventListener('keydown', function(e) {
                if (e.key === 'Escape') {
                    panel.style.display = 'none';
                    this.blur();
                }
            });

            // Keep open when clicking inside panel
            panel.addEventListener('click', function(e) {
                e.stopPropagation();
            });
        }

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

        // 產業洞察：點 report-header → inline 展開/收折（與每日報告完全一致）
        container.querySelectorAll('.report-header[data-report-route]').forEach(header => {
            header.addEventListener('click', async function() {
                const wasExpanded = this.classList.contains('expanded');
                // Collapse any other expanded header in the same industry section
                this.closest('.industry-section').querySelectorAll('.report-header.expanded').forEach(h => {
                    if (h !== this) h.classList.remove('expanded');
                });
                if (wasExpanded) {
                    this.classList.remove('expanded');
                } else {
                    this.classList.add('expanded');
                }
                // Load content via template (matched by report-header + report-body)
                const body = this.nextElementSibling;
                if (body && body.classList.contains('report-body')) {
                    const tmpl = body.querySelector('.report-body-template');
                    if (tmpl && tmpl.content && tmpl.content.children.length === 0) {
                        // First-time expand: fetch content from HTML
                        const route = this.getAttribute('data-report-route');
                        const htmlPath = routeMap[route];
                        if (htmlPath) {
                            try {
                                const resp = await fetch(htmlPath);
                                const html = await resp.text();
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(html, 'text/html');
                                const reportContent = doc.querySelector('.report-content');
                                if (reportContent) {
                                    const div = document.createElement('div');
                                    div.className = 'report-body-inner';
                                    div.innerHTML = reportContent.innerHTML;
                                    body.insertBefore(div, tmpl);
                                }
                            } catch(e) { /* silent fail */ }
                        }
                    }
                    if (wasExpanded) {
                        // Clean up body-inner generated from template on collapse
                        const inner = body.querySelector('.report-body-inner');
                        if (inner) inner.remove();
                    }
                }
                if (this.classList.contains('expanded') && body) {
                    body.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
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
                    for (const r of mgmt) {
                        html += `<div class="timeline-report">`;
                        html += `<div class="report-header" data-audit-route="${r.route}">`;
                        html += `<span class="report-arrow">▸</span>`;
                        html += `<span class="report-title">${r.title}</span>`;
                        html += `<span class="report-date">${r.date}</span>`;
                        html += `</div>`;
                        html += `<div class="report-body"><template class="report-body-template"></template></div>`;
                        html += `</div>`;
                    }
                    html += `</div>`;
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
                    for (const r of fin) {
                        html += `<div class="timeline-report">`;
                        html += `<div class="report-header" data-audit-route="${r.route}">`;
                        html += `<span class="report-arrow">▸</span>`;
                        html += `<span class="report-title">${r.title}</span>`;
                        html += `<span class="report-date">${r.date}</span>`;
                        html += `</div>`;
                        html += `<div class="report-body"><template class="report-body-template"></template></div>`;
                        html += `</div>`;
                    }
                    html += `</div>`;
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

        // 審計報告：點 report-header → inline 展開/收折（與每日報告完全一致）
        container.querySelectorAll('.report-header[data-audit-route]').forEach(header => {
            header.addEventListener('click', async function() {
                const wasExpanded = this.classList.contains('expanded');
                // Close other expanded headers in same audit-type-body
                const parentSection = this.closest('.audit-type-section');
                if (parentSection) {
                    parentSection.querySelectorAll('.report-header.expanded').forEach(h => {
                        if (h !== this) h.classList.remove('expanded');
                    });
                }
                if (wasExpanded) {
                    this.classList.remove('expanded');
                } else {
                    this.classList.add('expanded');
                }
                // Load content via template
                const body = this.nextElementSibling;
                if (body && body.classList.contains('report-body')) {
                    const tmpl = body.querySelector('.report-body-template');
                    if (tmpl && tmpl.content && tmpl.content.children.length === 0) {
                        const route = this.getAttribute('data-audit-route');
                        const htmlPath = routeMap[route];
                        if (htmlPath) {
                            try {
                                const resp = await fetch(htmlPath);
                                const html = await resp.text();
                                const parser = new DOMParser();
                                const doc = parser.parseFromString(html, 'text/html');
                                const reportContent = doc.querySelector('.report-content');
                                if (reportContent) {
                                    const div = document.createElement('div');
                                    div.className = 'report-body-inner';
                                    div.innerHTML = reportContent.innerHTML;
                                    body.insertBefore(div, tmpl);
                                }
                            } catch(e) { /* silent fail */ }
                        }
                    }
                    if (wasExpanded) {
                        const inner = body.querySelector('.report-body-inner');
                        if (inner) inner.remove();
                    }
                }
                if (this.classList.contains('expanded') && body) {
                    body.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
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
