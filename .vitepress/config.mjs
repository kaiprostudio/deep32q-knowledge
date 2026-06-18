import { defineConfig } from 'vitepress'

// ─── 審計報告公司資料（手動維護、時間降序） ───
//
// 排序規則：最新報告日期降序，同日期依代碼排序
// 命名規則：sidebar 顯示為「代碼 名稱」，預設用目錄底線格式
// 經營審計 13 檔、財務審計 19 檔

const 經營審計列表 = [
  { text: '2313 華通電腦', link: '/審計報告庫/經營審計/2313_華通/' },
  { text: '6239 力成',     link: '/審計報告庫/經營審計/6239_力成/' },
  { text: '2492 華新科',   link: '/審計報告庫/經營審計/2492_華新科/' },
  { text: '6442 光聖',     link: '/審計報告庫/經營審計/6442_光聖/' },
  { text: '3163 波若威',   link: '/審計報告庫/經營審計/3163_波若威/' },
  { text: '6903 巨漢',     link: '/審計報告庫/經營審計/6903_巨漢/' },
  { text: '3135 凌航',     link: '/審計報告庫/經營審計/3135_凌航/' },
  { text: '8064 東捷',     link: '/審計報告庫/經營審計/8064_東捷/' },
  { text: '4967 十銓',     link: '/審計報告庫/經營審計/4967_十銓/' },
  { text: '8103 瀚荃',     link: '/審計報告庫/經營審計/8103_瀚荃/' },
  { text: '6261 久元',     link: '/審計報告庫/經營審計/6261_久元/' },
  { text: '6290 良維',     link: '/審計報告庫/經營審計/6290_良維/' },
  { text: '3189 景碩',     link: '/審計報告庫/經營審計/3189_景碩/' },
]

const 財務審計列表 = [
  { text: '2313 華通電腦', link: '/審計報告庫/財務審計/2313_華通/' },
  { text: '6239 力成',     link: '/審計報告庫/財務審計/6239_力成/' },
  { text: '2492 華新科',   link: '/審計報告庫/財務審計/2492_華新科/' },
  { text: '3036 文曄',     link: '/審計報告庫/財務審計/3036_文曄/' },
  { text: '3680 家登',     link: '/審計報告庫/財務審計/3680_家登/' },
  { text: '6442 光聖',     link: '/審計報告庫/財務審計/6442_光聖/' },
  { text: '3163 波若威',   link: '/審計報告庫/財務審計/3163_波若威/' },
  { text: '6903 巨漢',     link: '/審計報告庫/財務審計/6903_巨漢/' },
  { text: '3105 穩懋',     link: '/審計報告庫/財務審計/3105_穩懋/' },
  { text: '3135 凌航',     link: '/審計報告庫/財務審計/3135_凌航/' },
  { text: '6257 矽格',     link: '/審計報告庫/財務審計/6257_矽格/' },
  { text: '1727 中華化',   link: '/審計報告庫/財務審計/1727_中華化/' },
  { text: '8074 鉅橡',     link: '/審計報告庫/財務審計/8074_鉅橡/' },
  { text: '8064 東捷',     link: '/審計報告庫/財務審計/8064_東捷/' },
  { text: '4967 十銓',     link: '/審計報告庫/財務審計/4967_十銓/' },
  { text: '8103 瀚荃',     link: '/審計報告庫/財務審計/8103_瀚荃/' },
  { text: '6261 久元',     link: '/審計報告庫/財務審計/6261_久元/' },
  { text: '6290 良維',     link: '/審計報告庫/財務審計/6290_良維/' },
  { text: '3189 景碩',     link: '/審計報告庫/財務審計/3189_景碩/' },
]

export default defineConfig({
  title: 'Deep32Q 投資知識庫',
  description: '系統化投資研究與審計報告知識庫',
  lang: 'zh-TW',
  base: '/',

  appearance: 'dark',

  ignoreDeadLinks: true,

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
          collapsed: false,
          items: 經營審計列表,
        },
        {
          text: `🟢 財務審計（共 ${財務審計列表.length} 檔）`,
          collapsed: false,
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
