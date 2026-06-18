<template>
  <div class="audit-accordion">
    <!-- 頂部摘要卡片 -->
    <div class="summary-card">
      <div class="summary-header">
        <span class="stock-code">{{ stockCode }}</span>
        <span class="stock-name">{{ stockName }}</span>
        <span class="audit-date" v-if="singleDate">{{ singleDate }}</span>
      </div>
      <div v-if="rating" class="rating-bar" :class="ratingClass">
        {{ rating }}
      </div>
      <div class="report-count">
        {{ allReportsCount }}
      </div>
    </div>

    <!-- 日期版本 Tabs（多日期時顯示） -->
    <div v-if="dates.length > 1" class="date-tab-bar">
      <button
        v-for="(d, idx) in dates"
        :key="idx"
        class="date-tab-btn"
        :class="{ active: activeDateIdx === idx }"
        @click="activeDateIdx = idx"
      >
        {{ formatDate(d) }}
        <span class="date-report-count">({{ reportsByDate[d].length }})</span>
      </button>
    </div>

    <!-- 題組 Tabs（經營組 / 財務組） -->
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
        ref="accordionRefs"
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

        <!-- 展開區：顯示報告內容 -->
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
import { ref, computed, watch, nextTick } from 'vue'

const props = defineProps({
  stockCode: { type: String, required: true },
  stockName: { type: String, default: '' },
  auditDate: { type: String, default: '' },
  reports: { type: Array, default: () => [] },
  rating: { type: String, default: '' },
})

const activeTab = ref(0)
const activeDateIdx = ref(0)
const openIdx = ref(null)
const accordionRefs = ref([])
const loading = ref(false)
const error = ref('')
const renderedContent = ref('')

// --- 日期版本邏輯 ---
const reportsByDate = computed(() => {
  const map = {}
  for (const r of props.reports) {
    const d = r.date || props.auditDate || 'unknown'
    if (!map[d]) map[d] = []
    map[d].push(r)
  }
  return map
})

const dates = computed(() => {
  return Object.keys(reportsByDate.value).sort().reverse()
})

const singleDate = computed(() => {
  return dates.value.length === 1 ? dates.value[0] : null
})

// 全部統計
const allReportsCount = computed(() => {
  const total = props.reports.length
  const verCount = dates.value.length
  if (verCount > 1) {
    return `共 ${total} 份報告（${verCount} 個版本）`
  }
  return `共 ${total} 份報告`
})

function formatDate(d) {
  if (d.length === 8) {
    return `${d.slice(0,4)}-${d.slice(4,6)}-${d.slice(6,8)}`
  }
  return d
}

// --- 展開 / 收折邏輯 ---
async function toggleReport(idx, report) {
  if (openIdx.value === idx) {
    openIdx.value = null
    return
  }
  openIdx.value = idx
  loading.value = true
  error.value = ''
  renderedContent.value = ''

  // 展開後立即 scroll 到該題最上方
  nextTick(() => {
    const el = accordionRefs.value?.[idx]
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  })

  try {
    let p = report.path
    if (p.startsWith('./')) p = p.slice(2)
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
    const mainEl = div.querySelector('main > div') || div.querySelector('main') || div.querySelector('.vp-doc') || div.querySelector('.content')
    if (mainEl) {
      renderedContent.value = mainEl.innerHTML
    } else {
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
    const items = (activeDateIdx.value === 0 ? currentDateReports.value : Object.values(reportsByDate.value)[activeDateIdx.value] || [])
      .filter(r => r.id && r.id.startsWith(prefix))
    if (items.length) {
      const label = prefix === 'G' ? '🔵 經營組' : '🟢 財務組'
      result.push({ label, reports: items })
    }
  }
  return result
})

const currentDateReports = computed(() => {
  const d = dates.value[activeDateIdx.value]
  return d ? reportsByDate.value[d] : props.reports
})

const visibleReports = computed(() => {
  const raw = currentDateReports.value
  if (!hasTabs.value) return raw
  const tab = tabs.value[activeTab.value]
  return tab ? tab.reports : raw
})

// Tab / 日期切換時關閉展開
watch(activeTab, () => {
  openIdx.value = null
  loading.value = false
  error.value = ''
  renderedContent.value = ''
})

watch(activeDateIdx, () => {
  openIdx.value = null
  activeTab.value = 0
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
  max-width: 100%;
  margin: 0 auto;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

/* 摘要卡片 */
.summary-card {
  background: transparent;
  border: none;
  border-radius: 0;
  padding: 16px 0;
  margin-bottom: 12px;
}
.summary-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  flex-wrap: wrap;
}
.stock-code {
  font-size: 1.3rem;
  font-weight: 700;
  color: #7eb8da;
}
.stock-name {
  font-size: 1.6rem;
  font-weight: 700;
  color: #e0e8f0;
}
.audit-date {
  font-size: 0.95rem;
  color: #7a8a9a;
  margin-left: auto;
}
.rating-bar {
  margin-top: 14px;
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 1rem;
  font-weight: 600;
  display: inline-block;
}
.rating-a { background: #1b5e20; color: #b9f6ca; }
.rating-b-plus { background: #2e7d32; color: #c8e6c9; }
.rating-b { background: #4a6a3a; color: #dcedc8; }
.rating-c { background: #7a5a20; color: #fff9c4; }
.rating-d { background: #7a2020; color: #ffcdd2; }
.report-count {
  margin-top: 10px;
  font-size: 0.9rem;
  color: #6a7a8a;
}

/* 日期版本 Tabs */
.date-tab-bar {
  display: flex;
  gap: 6px;
  margin-bottom: 12px;
  background: transparent;
  border-radius: 0;
  padding: 0;
  border-bottom: 1px solid #2a3a4a;
}
.date-tab-btn {
  flex: none;
  padding: 8px 12px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #7a8a9a;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
  text-align: center;
}
.date-tab-btn:hover {
  color: #c0d0e0;
}
.date-tab-btn.active {
  color: #e0e8f0;
  font-weight: 600;
  border-bottom: 2px solid #60a5fa;
}
.date-report-count {
  font-size: 0.8rem;
  color: #5a7a9a;
  margin-left: 4px;
}

/* 題組 Tabs */
.tab-bar {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
  background: transparent;
  border-radius: 0;
  padding: 0;
  border-bottom: 1px solid #2a3a4a;
}
.tab-btn {
  flex: none;
  padding: 8px 14px;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #7a8a9a;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}
.tab-btn:hover {
  color: #c0d0e0;
}
.tab-btn.active {
  color: #60a5fa;
  font-weight: 600;
  border-bottom: 2px solid #60a5fa;
}

/* 報告清單 */
.accordion-list {
  display: flex;
  flex-direction: column;
  gap: 0;
}
.accordion-item {
  border: none;
  border-radius: 0;
  overflow: visible;
  background: transparent;
  transition: none;
  border-bottom: 1px solid #1e2a3a;
}
.accordion-item:last-child {
  border-bottom: none;
}
.accordion-item:hover {
  background: transparent;
}
.accordion-item.expanded {
  background: transparent;
}
.accordion-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border: none;
  background: transparent;
  color: #c8d8e8;
  font-size: 1rem;
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
  min-width: 44px;
}
.chevron {
  font-size: 0.85rem;
  color: #5a7a9a;
  transition: transform 0.2s;
  margin-left: 8px;
}
.chevron.rotated {
  transform: rotate(90deg);
}

/* 展開區（報告內容）— 一頁式流入頁面流，不限制高度 */
.accordion-body {
  border: none;
  padding: 16px 0 24px;
  background: transparent;
}
.loading-text {
  color: #6a8aaa;
  font-size: 0.95rem;
  padding: 14px 0;
}
.error-text {
  color: #cc5555;
  font-size: 0.95rem;
  padding: 14px 0;
}

/* Markdown 渲染樣式 */
.markdown-content {
  font-size: 1rem;
  line-height: 1.8;
  color: #c8d8e8;
}
.markdown-content :deep(h1),
.markdown-content :deep(h2),
.markdown-content :deep(h3) {
  color: #e0e8f0;
  margin: 1.2em 0 0.6em;
}
.markdown-content :deep(h1) { font-size: 1.5rem; }
.markdown-content :deep(h2) { font-size: 1.3rem; }
.markdown-content :deep(h3) { font-size: 1.15rem; }
.markdown-content :deep(h4) { font-size: 1.05rem; }
.markdown-content :deep(p) {
  margin: 0.6em 0;
}
.markdown-content :deep(strong) {
  color: #e0e8f0;
}
.markdown-content :deep(code) {
  background: #1a2432;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.9rem;
  color: #7eb8da;
}
.markdown-content :deep(pre) {
  background: #0c1420;
  border: 1px solid #1e2a3a;
  border-radius: 8px;
  padding: 14px 18px;
  overflow-x: auto;
  margin: 0.8em 0;
}
.markdown-content :deep(pre code) {
  background: none;
  padding: 0;
  color: #b8c8d8;
}
.markdown-content :deep(ul) {
  padding-left: 24px;
  margin: 0.4em 0;
}
.markdown-content :deep(li) {
  margin: 0.4em 0;
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
@media (max-width: 768px) {
  .summary-card {
    padding: 12px 0;
  }
  .stock-code {
    font-size: 1.1rem;
  }
  .stock-name {
    font-size: 1.3rem;
  }
  .audit-date {
    font-size: 0.85rem;
    margin-left: 0;
    width: 100%;
    margin-top: 4px;
  }
  .report-title {
    font-size: 0.95rem;
    flex-wrap: wrap;
  }
  .report-id {
    min-width: 36px;
  }
  .accordion-header {
    padding: 10px 0;
    font-size: 0.95rem;
  }
  .accordion-body {
    padding: 12px 0 20px;
  }
  .date-tab-btn {
    padding: 6px 10px;
    font-size: 0.85rem;
  }
  .tab-btn {
    padding: 6px 10px;
    font-size: 0.85rem;
  }
}
</style>
