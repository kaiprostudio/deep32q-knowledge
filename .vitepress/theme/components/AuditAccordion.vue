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

    <!-- Accordion 清單 -->
    <div class="accordion-list">
      <div
        v-for="(report, idx) in visibleReports"
        :key="idx"
        class="accordion-item"
      >
        <button
          class="accordion-header"
          @click="goToReport(report)"
        >
          <span class="report-title">
            <span class="report-id">{{ report.id }}</span>
            {{ displayTitle(report) }}
          </span>
          <span class="chevron">▸</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useRouter } from 'vitepress'

const props = defineProps({
  stockCode: { type: String, required: true },
  stockName: { type: String, default: '' },
  auditDate: { type: String, default: '' },
  reports: { type: Array, default: () => [] },
  rating: { type: String, default: '' },
})

const router = useRouter()
const activeTab = ref(0)

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

// 判斷是否有經營組+財務組混合
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

function displayTitle(report) {
  // 從 title 移除前綴 ID 重複部分（如 "G01_公司歷史..." 只顯示 "公司歷史..."）
  let t = report.title || ''
  if (report.id) {
    // 嘗試匹配 "G01_" 或 "F01_" 前綴
    const prefix = report.id + '_'
    if (t.startsWith(prefix)) {
      t = t.slice(prefix.length)
    }
    // 也嘗試 "G01_" 後綴的變體
    const prefix2 = report.id + '-'
    if (t.startsWith(prefix2)) {
      t = t.slice(prefix2.length)
    }
  }
  // 移除末尾的 _角色名
  t = t.replace(/_(投資研究員|產品經理|績效管理專家|企業風險評估專家|產品趨勢研究員)$/, '')
  return t
}

function goToReport(report) {
  // 將相對 path 轉為路由
  // path 如 "./20260617/G01_公司歷史與創辦人.md"
  let p = report.path
  // 移除開頭的 "./"
  if (p.startsWith('./')) p = p.slice(2)
  // 移除 .md 副檔名
  if (p.endsWith('.md')) p = p.slice(0, -3)
  // 構建完整路由（相對於當前目錄）
  router.go(p)
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
  cursor: pointer;
}
.accordion-item:hover {
  border-color: #3a5a7a;
  background: #1a2432;
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
}
</style>
