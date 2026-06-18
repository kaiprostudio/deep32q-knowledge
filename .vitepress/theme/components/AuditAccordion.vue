<template>
  <div class="audit-accordion">
    <!-- 頂部摘要卡片 -->
    <div class="summary-card">
      <div class="summary-header">
        <span class="stock-code">{{ stockCode }}</span>
        <span class="stock-name">{{ stockName }}</span>
        <span class="audit-date">{{ auditDate }}</span>
      </div>
      <div v-if="rating" class="rating-bar" :class="ratingClass">
        {{ rating }}
      </div>
      <div class="report-count">
        共 {{ reports.length }} 份報告
      </div>
    </div>

    <!-- 題組 Tabs (經營組 / 財務組) -->
    <div v-if="hasTabs" class="tab-bar">
      <button
        v-for="(tab, idx) in tabs"
        :key="idx"
        class="tab-btn"
        :class="{ active: activeTab === idx }"
        @click="activeTab = idx"
      >
        {{ tab.label }} ({{ tab.reports.length }})
      </button>
    </div>

    <!-- Accordion 清單（點擊展開/收折內容） -->
    <div class="accordion-list">
      <div
        v-for="(report, idx) in visibleReports"
        :key="idx"
        class="accordion-item"
        :class="{ expanded: openIdx === idx }"
      >
        <button
          class="accordion-header"
          @click="toggleReport(idx, report)"
        >
          <span class="report-title">
            <span class="report-id">{{ report.id }}</span>
            {{ displayTitle(report) }}
          </span>
          <span class="chevron" :class="{ rotated: openIdx === idx }">▸</span>
        </button>

        <!-- 展開區：顯示 .md 內容 -->
        <div v-if="openIdx === idx" class="accordion-body">
          <div v-if="loading" class="loading-text">載入中⋯</div>
          <div v-else-if="error" class="error-text">{{ error }}</div>
          <div v-else class="markdown-content" v-html="renderedContent" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'

const props = defineProps({
  stockCode: { type: String, required: true },
  stockName: { type: String, default: '' },
  auditDate: { type: String, default: '' },
  reports: { type: Array, default: () => [] },
  rating: { type: String, default: '' },
})

const activeTab = ref(0)
const openIdx = ref(null)
const loading = ref(false)
const error = ref('')
const renderedContent = ref('')

// --- 展開 / 收折邏輯 ---
async function toggleReport(idx, report) {
  if (openIdx.value === idx) {
    openIdx.value = null   // 收折
    return
  }
  openIdx.value = idx
  loading.value = true
  error.value = ''
  renderedContent.value = ''

  try {
    // 從 path 推算對應的 .html URL
    let p = report.path
    if (p.startsWith('./')) p = p.slice(2)
    // 將 .md 改為 .html（VitePress build 產出的路徑）
    p = p.replace(/\.md$/, '.html')
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : ''
    const dir = currentPath.substring(0, currentPath.lastIndexOf('/') + 1)
    const fetchUrl = dir + p

    const resp = await fetch(fetchUrl)
    if (!resp.ok) {
      error.value = `無法載入報告（${resp.status}）`
      loading.value = false
      return
    }
    const htmlText = await resp.text()
    const div = document.createElement('div')
    div.innerHTML = htmlText
    // 從 HTML 頁面中提取主要內容區
    const mainEl = div.querySelector('main > div') || div.querySelector('main') || div.querySelector('.vp-doc') || div.querySelector('.content')
    if (mainEl) {
      renderedContent.value = mainEl.innerHTML
    } else {
      // fallback: 從 body 提取非 nav/sidebar/footer 的內容
      const body = div.querySelector('body')
      if (body) {
        const clones = []
        for (const child of body.children) {
          const tag = child.tagName.toLowerCase()
          if (tag !== 'nav' && tag !== 'aside' && tag !== 'footer' && !child.closest && child.id !== 'app') {
            clones.push(child.outerHTML)
          }
        }
        renderedContent.value = clones.join('')
      } else {
        renderedContent.value = htmlText.slice(0, 3000)
      }
    }
  } catch (e) {
    error.value = `載入失敗：${e.message}`
  } finally {
    loading.value = false
  }
}

// 簡易 Markdown → HTML 轉換（足夠呈現報告內容）
function mdToHtml(text) {
  if (!text) return ''
  let html = text
    // 程式碼區塊 (```) 先保護
    .replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      const langClass = lang ? ` class="language-${lang}"` : ''
      return `<pre${langClass}><code>${escapeHtml(code.trim())}</code></pre>`
    })
    // 行內程式碼
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // 標題 (# ~ ######)
    .replace(/^###### (.*$)/gm, '<h6>$1</h6>')
    .replace(/^##### (.*$)/gm, '<h5>$1</h5>')
    .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
    .replace(/^### (.*$)/gm, '<h3>$1</h3>')
    .replace(/^## (.*$)/gm, '<h2>$1</h2>')
    .replace(/^# (.*$)/gm, '<h1>$1</h1>')
    // 粗體
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // 斜體
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // 清單 (- 或 *)
    .replace(/^[-*] (.+)$/gm, '<li>$1</li>')
    // 數字清單
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // 分隔線
    .replace(/^---$/gm, '<hr>')
    // 圖片
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1">')
    // 連結
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>')
    // 合併連續 <li> 成 <ul>
    .replace(/((?:<li>.*?<\/li>\n?)+)/g, '<ul>$1</ul>')
    // 段落（雙換行）
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(.+)$/gm, (m) => {
      // 跳過已經被包裝在 HTML tag 裡的行
      if (m.trim().startsWith('<')) return m
      return `<p>${m}</p>`
    })

  return html
}

function escapeHtml(str) {
  const div = document.createElement('div')
  div.textContent = str
  return div.innerHTML
}

// 評級 CSS class
const ratingClass = computed(() => {
  if (!props.rating) return ''
  const r = props.rating.toLowerCase()
  if (r.includes('a')) return 'rating-a'
  if (r.includes('b+') || r.includes('b＋')) return 'rating-b-plus'
  if (r.includes('b')) return 'rating-b'
  if (r.includes('c')) return 'rating-c'
  if (r.includes('d')) return 'rating-d'
  return ''
})

// Tab 邏輯
const groups = computed(() => {
  const g = new Set()
  for (const r of props.reports) {
    const match = r.id && r.id.match(/^([A-Z])/)
    if (match) g.add(match[1])
  }
  return [...g].sort()
})

const hasTabs = computed(() => groups.value.length > 1)

const tabs = computed(() => {
  if (!hasTabs.value) return []
  const result = []
  for (const prefix of ['G', 'F']) {
    const items = props.reports.filter(r => r.id && r.id.startsWith(prefix))
    if (items.length) {
      const label = prefix === 'G' ? '🔵 經營組' : '🟢 財務組'
      result.push({ label, reports: items })
    }
  }
  return result
})

const visibleReports = computed(() => {
  if (!hasTabs.value) return props.reports
  const tab = tabs.value[activeTab.value]
  return tab ? tab.reports : props.reports
})

// Tab 切換時關閉展開
watch(activeTab, () => {
  openIdx.value = null
  loading.value = false
  error.value = ''
  renderedContent.value = ''
})

function displayTitle(report) {
  let t = report.title || ''
  if (report.id) {
    const prefix = report.id + '_'
    if (t.startsWith(prefix)) t = t.slice(prefix.length)
    const prefix2 = report.id + '-'
    if (t.startsWith(prefix2)) t = t.slice(prefix2.length)
  }
  t = t.replace(/_(投資研究員|產品經理|績效管理專家|企業風險評估專家|產品趨勢研究員)$/, '')
  return t
}
</script>

<style scoped>
.audit-accordion {
  max-width: 960px;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 摘要卡片 */
.summary-card {
  background: linear-gradient(135deg, #1a2332 0%, #0d1520 100%);
  border: 1px solid #2a3a4a;
  border-radius: 12px;
  padding: 20px 24px;
  margin-bottom: 20px;
}
.summary-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
.stock-code {
  font-size: 1.2rem;
  font-weight: 700;
  color: #7eb8da;
}
.stock-name {
  font-size: 1.5rem;
  font-weight: 700;
  color: #e0e8f0;
}
.audit-date {
  font-size: 0.85rem;
  color: #7a8a9a;
  margin-left: auto;
}
.rating-bar {
  margin-top: 12px;
  padding: 6px 16px;
  border-radius: 20px;
  font-size: 0.9rem;
  font-weight: 600;
  display: inline-block;
}
.rating-a { background: #1b5e20; color: #b9f6ca; }
.rating-b-plus { background: #2e7d32; color: #c8e6c9; }
.rating-b { background: #4a6a3a; color: #dcedc8; }
.rating-c { background: #7a5a20; color: #fff9c4; }
.rating-d { background: #7a2020; color: #ffcdd2; }
.report-count {
  margin-top: 8px;
  font-size: 0.8rem;
  color: #6a7a8a;
}

/* Tabs */
.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  background: #161e2a;
  border-radius: 10px;
  padding: 4px;
}
.tab-btn {
  flex: 1;
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: #7a8a9a;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn:hover {
  color: #c0d0e0;
  background: #1e2a3a;
}
.tab-btn.active {
  background: #2a3a4a;
  color: #e0e8f0;
  font-weight: 600;
}

/* 報告清單 */
.accordion-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.accordion-item {
  border: 1px solid #222a3a;
  border-radius: 8px;
  overflow: hidden;
  background: #141c28;
  transition: border-color 0.2s, background 0.2s;
}
.accordion-item:hover {
  border-color: #3a5a7a;
  background: #1a2432;
}
.accordion-item.expanded {
  border-color: #3a6a9a;
  background: #162030;
}
.accordion-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border: none;
  background: transparent;
  color: #c8d8e8;
  font-size: 0.9rem;
  cursor: pointer;
  text-align: left;
  transition: color 0.2s;
}
.accordion-item:hover .accordion-header {
  color: #e8f0f8;
}
.report-title {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.report-id {
  font-family: 'SF Mono', 'Fira Code', monospace;
  font-size: 0.85rem;
  font-weight: 600;
  color: #7eb8da;
  min-width: 48px;
}
.chevron {
  font-size: 0.8rem;
  color: #5a7a9a;
  transition: transform 0.2s;
  margin-left: 8px;
}
.chevron.rotated {
  transform: rotate(90deg);
}

/* 展開區（報告內容） */
.accordion-body {
  border-top: 1px solid #2a3a4a;
  padding: 16px 20px;
  background: #0e1622;
  max-height: 80vh;
  overflow-y: auto;
}
.loading-text {
  color: #6a8aaa;
  font-size: 0.85rem;
  padding: 12px 0;
}
.error-text {
  color: #cc5555;
  font-size: 0.85rem;
  padding: 12px 0;
}

/* Markdown 渲染樣式 */
.markdown-content {
  font-size: 0.9rem;
  line-height: 1.7;
  color: #c8d8e8;
}
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3) {
  color: #e0e8f0;
  margin: 1.2em 0 0.6em;
}
.markdown-content :deep(h1) { font-size: 1.3rem; }
.markdown-content :deep(h2) { font-size: 1.15rem; }
.markdown-content :deep(h3) { font-size: 1.05rem; }
.markdown-content :deep(h4) { font-size: 1rem; }
.markdown-content :deep(p) {
  margin: 0.6em 0;
}
.markdown-content :deep(strong) {
  color: #e0e8f0;
}
.markdown-content :deep(code) {
  background: #1a2432;
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.85rem;
  color: #7eb8da;
}
.markdown-content :deep(pre) {
  background: #0c1420;
  border: 1px solid #1e2a3a;
  border-radius: 8px;
  padding: 12px 16px;
  overflow-x: auto;
  margin: 0.8em 0;
}
.markdown-content :deep(pre code) {
  background: none;
  padding: 0;
  color: #b8c8d8;
}
.markdown-content :deep(ul) {
  padding-left: 20px;
  margin: 0.4em 0;
}
.markdown-content :deep(li) {
  margin: 0.3em 0;
}
.markdown-content :deep(hr) {
  border: none;
  border-top: 1px solid #2a3a4a;
  margin: 1em 0;
}
.markdown-content :deep(a) {
  color: #7eb8da;
  text-decoration: underline;
}
.markdown-content :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 0.8em 0;
}

/* 手機響應 */
@media (max-width: 720px) {
  .summary-card {
    padding: 14px 16px;
  }
  .stock-name {
    font-size: 1.2rem;
  }
  .stock-code {
    font-size: 1rem;
  }
  .audit-date {
    font-size: 0.75rem;
    margin-left: 0;
    width: 100%;
    margin-top: 4px;
  }
  .report-title {
    font-size: 0.85rem;
    flex-wrap: wrap;
  }
  .report-id {
    min-width: 36px;
  }
  .accordion-header {
    padding: 10px 12px;
  }
  .accordion-body {
    padding: 12px 14px;
    max-height: 70vh;
  }
}
</style>
