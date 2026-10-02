import { useState } from 'react'
import { useI18n } from '../lib/i18n'
import { SettingsModal } from './SettingsModal'

export function Header() {
  const { t } = useI18n()
  const [isSettingsOpen, setIsSettingsOpen] = useState(false)

  return (
    <>
      <header className="flex items-center justify-between gap-4 select-none">
        <div className="flex items-center gap-3">
          {/* Apple AirDrop Radar Icon */}
          <div className="relative w-10 h-10 rounded-2xl bg-gradient-to-b from-[#007AFF] to-[#0051D5] dark:from-[#0A84FF] dark:to-[#0062CC] shadow-[0_2px_8px_rgba(0,122,255,0.35)] flex items-center justify-center text-white shrink-0">
            <svg
              className="w-5 h-5 text-white"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 20h.01" />
              <path d="M8.5 16.5a5 5 0 0 1 7 0" />
              <path d="M5 13a10 10 0 0 1 14 0" />
              <path d="M1.5 9.5a15 15 0 0 1 21 0" />
            </svg>
          </div>

          <div className="space-y-0.5">
            <h1 className="text-[21px] font-semibold tracking-[-0.025em] text-[#1D1D1F] dark:text-[#F5F5F7]">
              {t('title')}
            </h1>
            <p className="text-[12px] text-[#86868B] dark:text-[#98989D] font-normal leading-tight">
              {t('tagline')}
            </p>
          </div>
        </div>

        {/* Apple HIG Settings Gear Button */}
        <button
          type="button"
          onClick={() => setIsSettingsOpen(true)}
          className="w-9 h-9 rounded-full bg-[#767680]/12 dark:bg-[#767680]/24 text-[#1D1D1F] dark:text-[#F5F5F7] hover:bg-[#767680]/18 dark:hover:bg-[#767680]/32 active:scale-95 transition-all duration-150 flex items-center justify-center cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
          aria-label={t('settings')}
          title={t('settings')}
        >
          <svg
            className="w-4.5 h-4.5 text-[#1D1D1F] dark:text-[#F5F5F7]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </header>

      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} />
    </>
  )
}
