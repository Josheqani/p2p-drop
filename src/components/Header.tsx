import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { LanguageToggle } from './LanguageToggle'
import { SettingsModal } from './SettingsModal'

export function Header() {
  const { t } = useI18n()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <>
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white/60 dark:bg-slate-800/60 p-1.5 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center justify-center h-8 w-8"
            aria-label={t('settings')}
            title={t('settings')}
          >
            ⚙️
          </button>
          <LanguageToggle />
        </div>
      </header>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  )
}
