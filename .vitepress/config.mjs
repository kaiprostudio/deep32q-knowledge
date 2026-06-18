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
          text: '經營審計',
          collapsed: false,
          items: [
            { text: '力成 (6239) 2026/06', link: '/審計報告庫/經營審計/6239_力成/20260617/' },
            { text: '力成 (6239) G01 公司歷史', link: '/審計報告庫/經營審計/6239_力成/20260617/G01_公司歷史與創辦人' },
            { text: '力成 (6239) G02 董監事異動', link: '/審計報告庫/經營審計/6239_力成/20260617/G02_董監事異動' },
            { text: '力成 (6239) G03 員工流動率', link: '/審計報告庫/經營審計/6239_力成/20260617/G03_員工流動率' },
            { text: '力成 (6239) G04 核心產品', link: '/審計報告庫/經營審計/6239_力成/20260617/G04_核心產品與市佔' },
            { text: '力成 (6239) G05 營收模式', link: '/審計報告庫/經營審計/6239_力成/20260617/G05_營收模式' },
            { text: '力成 (6239) G06 行銷通路', link: '/審計報告庫/經營審計/6239_力成/20260617/G06_行銷通路' },
            { text: '力成 (6239) G07 研發成果', link: '/審計報告庫/經營審計/6239_力成/20260617/G07_研發成果' },
            { text: '力成 (6239) G08 區域銷售', link: '/審計報告庫/經營審計/6239_力成/20260617/G08_區域銷售與地緣' },
            { text: '力成 (6239) G09 客戶供應商', link: '/審計報告庫/經營審計/6239_力成/20260617/G09_客戶供應商' },
            { text: '力成 (6239) G10 護城河評估', link: '/審計報告庫/經營審計/6239_力成/20260617/G10_護城河評估' },
          ],
        },
        {
          text: '財務審計',
          collapsed: false,
          items: [
            { text: '力成 (6239) 2026/06', link: '/審計報告庫/財務審計/6239_力成/20260617/' },
            { text: '力成 (6239) F01 營收因子', link: '/審計報告庫/財務審計/6239_力成/20260617/F01_營收因子與定價權分析' },
            { text: '力成 (6239) F02 現金流品質', link: '/審計報告庫/財務審計/6239_力成/20260617/F02_營業現金流與獲利品質' },
            { text: '力成 (6239) F03 合約負債', link: '/審計報告庫/財務審計/6239_力成/20260617/F03_合約負債與營收能見度' },
            { text: '力成 (6239) F04 業外收支', link: '/審計報告庫/財務審計/6239_力成/20260617/F04_業外收支純度與收益質量' },
            { text: '力成 (6239) F05 應收帳款', link: '/審計報告庫/財務審計/6239_力成/20260617/F05_應收帳款品質與收款天數' },
            { text: '力成 (6239) F06 存貨穩定性', link: '/審計報告庫/財務審計/6239_力成/20260617/F06_存貨與債務穩定度審計' },
            { text: '力成 (6239) F07 存貨週轉對比', link: '/審計報告庫/財務審計/6239_力成/20260617/F07_存貨週轉效率同業對比' },
            { text: '力成 (6239) F08 產能利用率', link: '/審計報告庫/財務審計/6239_力成/20260617/F08_產能利用率與資產擴張' },
            { text: '力成 (6239) F09 毛利變動', link: '/審計報告庫/財務審計/6239_力成/20260617/F09_毛利變動與經營槓桿審計' },
            { text: '力成 (6239) F10 成本結構', link: '/審計報告庫/財務審計/6239_力成/20260617/F10_成本結構與經營槓桿門檻' },
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
