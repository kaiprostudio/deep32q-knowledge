import DefaultTheme from 'vitepress/theme'
import AuditAccordion from './components/AuditAccordion.vue'
import './custom.css'

export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component('AuditAccordion', AuditAccordion)
  },
}
