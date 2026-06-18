import { defineConfig } from 'vitepress'
import fs from 'fs'

// ─── 審計報告側邊欄資料（由 generate_index.py 自動產出） ───
// 執行 python3 審計報告庫/generate_index.py 後自動更新
// 排序規則：最新報告日期降序

function loadSidebar(path) {
  try {
    return JSON.parse(fs.readFileSync(path, 'utf-8'))
  } catch {
    return []
  }
}

const 經營審計列表 = loadSidebar('sidebar_data/經營審計.json')
const 財務審計列表 = loadSidebar('sidebar_data/財務審計.json')

export default defineConfig({
  title: 'Deep32Q 投資知識庫',
  description: '系統化投資研究與審計報告知識庫',
  lang: 'zh-TW',
  base: '/',

  appearance: 'dark',

  ignoreDeadLinks: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: 'anonymous' }],
    ['link', { href: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap', rel: 'stylesheet' }],
  ],

  themeConfig: {
    logo: '/favicon.svg',

    siteTitle: 'Deep32Q',

    search: {
      provider: 'local',
    },

    nav: [
      { text: '知識庫', link: '/Deep32Q知識庫/INDEX' },
      { text: '審計報告', link: '/審計報告庫/' },
    ],

    sidebar: {
      // ─── 知識庫側邊欄 ───
      '/Deep32Q知識庫/': [
        {
          text: '目錄',
          collapsed: false,
          items: [
            { text: '知識庫總覽', link: '/Deep32Q知識庫/INDEX' },
            { text: '變更日誌', link: '/Deep32Q知識庫/LOG' },
          ],
        },
        {
          text: '市場情緒',
          collapsed: false,
          items: [
            { text: '市場情緒列表', link: '/Deep32Q知識庫/市場情緒/' },
          ],
        },
        {
          text: '產業洞察',
          collapsed: false,
          items: [
            { text: '產業洞察列表', link: '/Deep32Q知識庫/產業洞察/' },
          ],
        },
        {
          text: '供應鏈拆解',
          collapsed: false,
          items: [
            { text: '供應鏈列表', link: '/Deep32Q知識庫/供應鏈拆解/' },
          ],
        },
        {
          text: '分析模式',
          collapsed: false,
          items: [
            { text: '分析模式列表', link: '/Deep32Q知識庫/分析模式/' },
          ],
        },
        {
          text: '報告輸出',
          collapsed: false,
          items: [
            { text: '最新報告', link: '/Deep32Q知識庫/報告輸出/' },
          ],
        },
      ],

      // ─── 審計報告庫側邊欄（扁平化） ───
      '/審計報告庫/': [
        {
          text: '審計報告庫',
          collapsed: false,
          items: [
            { text: '🏠 全部審計報告', link: '/審計報告庫/' },
          ],
        },
        {
          text: `🔵 經營審計（共 ${經營審計列表.length} 檔）`,
          collapsed: true,
          items: 經營審計列表,
        },
        {
          text: `🟢 財務審計（共 ${財務審計列表.length} 檔）`,
          collapsed: true,
          items: 財務審計列表,
        },
      ],
    },

    socialLinks: [
      { icon: 'github', link: 'https://github.com/kaiprostudio/deep32q-knowledge' },
    ],

    footer: {
      message: 'Deep32Q 投資系統 — 資料僅供參考，不構成投資建議',
      copyright: 'Copyright © 2026 Deep32Q',
    },
  },
})
