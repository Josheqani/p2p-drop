import { useI18n } from '../lib/i18n'

export function LanguageToggle() {
  const { lang, setLang, t } = useI18n()

  const toggleLanguage = () => {
    setLang(lang === 'en' ? 'fa' : 'en')
  }

  return (
    <button
      onClick={toggleLanguage}
      data-testid="language-toggle-btn"
      aria-label="Switch language"
      className="px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-700/60 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition border border-slate-200 dark:border-slate-600 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
    >
      🌐 {t('languageToggle')}
    </button>
  )
}
