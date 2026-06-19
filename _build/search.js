/**
 * Deep32Q 全文搜尋引擎
 * 載入 search_index.json 後提供即時全文搜尋
 */
(function() {
    'use strict';

    let searchIndex = [];
    let searchInput;
    let searchResults;

    const CATEGORY_NAMES = {
        'daily': '📅 每日報告',
        'industry': '📁 產業洞察',
        'audit': '📊 審計報告',
        'general': '📄 其他'
    };

    function init() {
        searchInput = document.getElementById('search-input');
        searchResults = document.getElementById('search-results');

        if (!searchInput || !searchResults) return;

        // Load search index
        fetch('/search_index.json')
            .then(r => r.json())
            .then(data => {
                searchIndex = data;
                console.log(`Search index loaded: ${data.length} entries`);
            })
            .catch(err => console.error('Failed to load search index:', err));

        // Bind events
        searchInput.addEventListener('input', onSearchInput);
        searchInput.addEventListener('focus', function() {
            if (searchInput.value.length >= 1 && searchResults.children.length > 0) {
                searchResults.classList.remove('hidden');
            }
        });
        document.addEventListener('click', function(e) {
            if (!searchResults.contains(e.target) && e.target !== searchInput) {
                searchResults.classList.add('hidden');
            }
        });
        searchInput.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
                searchResults.classList.add('hidden');
                searchInput.blur();
            }
            if (e.key === 'Enter') {
                const first = searchResults.querySelector('.search-result-item');
                if (first) first.click();
            }
        });
    }

    function onSearchInput() {
        const query = searchInput.value.trim().toLowerCase();
        if (query.length < 1) {
            searchResults.classList.add('hidden');
            return;
        }

        const results = search(query);

        if (results.length === 0) {
            searchResults.innerHTML = '<div class="search-result-item" style="color:var(--text-secondary);cursor:default;">無結果</div>';
        } else {
            const fragment = document.createDocumentFragment();
            const maxResults = 20;
            let count = 0;

            for (const r of results) {
                if (count >= maxResults) break;
                count++;

                const item = document.createElement('a');
                item.className = 'search-result-item';
                item.href = '#';
                item.setAttribute('data-route', r.route);

                const titleSpan = document.createElement('div');
                titleSpan.className = 'search-result-title';
                titleSpan.textContent = highlightMatch(r.title, query);

                const catSpan = document.createElement('span');
                catSpan.className = 'search-result-category';
                catSpan.textContent = CATEGORY_NAMES[r.category] || r.category;

                const summarySpan = document.createElement('div');
                summarySpan.className = 'search-result-summary';
                summarySpan.textContent = highlightMatch(r.summary || '', query);

                item.appendChild(titleSpan);
                item.appendChild(catSpan);
                item.appendChild(summarySpan);

                item.addEventListener('click', function(e) {
                    e.preventDefault();
                    const route = this.getAttribute('data-route');
                    navigateTo(route);
                    searchResults.classList.add('hidden');
                    searchInput.blur();
                });

                fragment.appendChild(item);
            }

            searchResults.innerHTML = '';
            searchResults.appendChild(fragment);
        }

        searchResults.classList.remove('hidden');
    }

    function search(query) {
        const terms = query.split(/\s+/).filter(t => t.length > 0);
        if (terms.length === 0) return [];

        const scored = [];

        for (const doc of searchIndex) {
            let score = 0;
            const searchText = (doc.title + ' ' + doc.summary + ' ' + doc.id).toLowerCase();

            for (const term of terms) {
                if (doc.title.toLowerCase().includes(term)) {
                    score += 10;
                }
                if (doc.summary.toLowerCase().includes(term)) {
                    score += 5;
                }
                if (doc.id.toLowerCase().includes(term)) {
                    score += 3;
                }
                // Partial match
                if (searchText.includes(term)) {
                    score += 2;
                }
            }

            if (score > 0) {
                scored.push({ ...doc, score });
            }
        }

        scored.sort((a, b) => b.score - a.score);
        return scored;
    }

    function highlightMatch(text, query) {
        if (!text || !query) return text || '';
        const terms = query.split(/\s+/).filter(t => t.length > 0);
        let result = text;
        for (const term of terms) {
            const regex = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
            result = result.replace(regex, '<mark>$1</mark>');
        }
        return result;
    }

    // Expose navigation function globally
    window.navigateTo = function(route) {
        // Route already in format like 'daily/2026-06-19/市場情緒_20260619'
        // Maps to /reports/___html via content.js
        window.location.href = '/?p=report&f=' + encodeURIComponent(route);
    };

    // Init on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
