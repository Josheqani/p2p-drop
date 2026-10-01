import { useI18n } from '../lib/i18n'
import { LanguageToggle } from './LanguageToggle'

export function Header() {
  const { t } = useI18n()

  return (
    <header className="flex items-start justify-between gap-4">
      <div className="space-y-1 text-start">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <span className="h-3 w-3 rounded-full bg-indigo-600 inline-block"></span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {t('title')}
          </h1>
        </div>
        <p className="text-xs text-slate-600 dark:text-slate-400">
          {t('tagline')}
        </p>
      </div>

      <LanguageToggle />
    </header>
  )
}
