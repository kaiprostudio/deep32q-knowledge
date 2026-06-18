import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'Deep32Q 投資知識庫',
  description: '系統化投資研究與審計報告知識庫',
  lang: 'zh-TW',
  base: '/',

  appearance: 'dark',

  ignoreDeadLinks: true, // 子目錄連結由 index.md 動態產生，非所有都有對應路由

  head: [
    ['link', { rel: 'icon', href: '/favicon.svg' }],
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
      '/審計報告庫/': [
        {
          text: '審計報告庫',
          collapsed: false,
          items: [
            { text: '總覽', link: '/審計報告庫/' },
          ],
        },
        {
          text: '經營審計（共 13 檔）',
          collapsed: false,
          items: [
            { text: '經營審計總覽', link: '/審計報告庫/經營審計/' },
          ],
        },
        {
          text: '財務審計（共 19 檔）',
          collapsed: false,
          items: [
            { text: '財務審計總覽', link: '/審計報告庫/財務審計/' },
          ],
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
