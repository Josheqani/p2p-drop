import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { DeviceInfo } from '../lib/deviceInfo'
import { useI18n } from '../lib/i18n'

interface JoinRequestModalProps {
  isOpen: boolean
  joinerInfo: DeviceInfo | null
  onAccept: () => void
  onDecline: () => void
}

export function JoinRequestModal({
  isOpen,
  joinerInfo,
  onAccept,
  onDecline,
}: JoinRequestModalProps) {
  const { t } = useI18n()
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (!isOpen || !joinerInfo || !mounted) return null

  const renderDeviceGlyph = (type: DeviceInfo['deviceType']) => {
    switch (type) {
      case 'mobile':
        return (
          <svg className="w-6 h-6 text-[#007AFF] dark:text-[#0A84FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="5" y="2" width="14" height="20" rx="3" ry="3" />
            <path d="M12 18h.01" />
          </svg>
        )
      case 'tablet':
        return (
          <svg className="w-6 h-6 text-[#007AFF] dark:text-[#0A84FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="4" y="2" width="16" height="20" rx="2" ry="2" />
            <line x1="12" y1="18" x2="12.01" y2="18" strokeWidth="3" />
          </svg>
        )
      case 'desktop':
      default:
        return (
          <svg className="w-6 h-6 text-[#007AFF] dark:text-[#0A84FF]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        )
    }
  }

  const modalContent = (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-request-title"
      className="fixed inset-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200 overflow-hidden"
    >
      <div className="w-full max-w-[420px] max-h-[85vh] overflow-y-auto bg-white/95 dark:bg-[#1E1E20]/95 backdrop-blur-2xl rounded-[24px] shadow-[0_24px_64px_rgba(0,0,0,0.3)] border border-black/[0.08] dark:border-white/[0.12] p-6 space-y-5 text-start animate-in zoom-in-95 duration-150">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-2xl bg-[#007AFF]/12 dark:bg-[#0A84FF]/20 flex items-center justify-center shrink-0">
            {renderDeviceGlyph(joinerInfo.deviceType)}
          </div>
          <div>
            <h2 id="join-request-title" className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
              {t('incomingRequestTitle')}
            </h2>
            <p className="text-[12px] text-[#86868B] dark:text-[#98989D] leading-tight mt-0.5">
              {t('incomingRequestDesc')}
            </p>
          </div>
        </div>

        {/* Apple Inset Device Info Group */}
        <div className="rounded-[18px] bg-[#F8F8FA] dark:bg-[#2C2C2E] p-4 border border-black/[0.04] dark:border-white/[0.06] space-y-3">
          <div className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-2">
            <span>{joinerInfo.displayName}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-[12px] pt-2 border-t border-black/[0.06] dark:border-white/[0.08]">
            <div>
              <span className="text-[#86868B] dark:text-[#98989D] text-[11px] block">{t('device')}</span>
              <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                {joinerInfo.deviceModel}
              </span>
            </div>

            <div>
              <span className="text-[#86868B] dark:text-[#98989D] text-[11px] block">{t('operatingSystem')}</span>
              <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                {joinerInfo.osName} {joinerInfo.osVersion}
              </span>
            </div>

            <div>
              <span className="text-[#86868B] dark:text-[#98989D] text-[11px] block">{t('browser')}</span>
              <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                {joinerInfo.browserName} {joinerInfo.browserVersion}
              </span>
            </div>

            <div>
              <span className="text-[#86868B] dark:text-[#98989D] text-[11px] block">{t('screen')}</span>
              <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                {joinerInfo.screenResolution}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons: Apple HIG Dual Action */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <button
            type="button"
            onClick={onDecline}
            className="w-full h-11 bg-[#767680]/12 hover:bg-[#767680]/18 dark:bg-[#767680]/24 dark:hover:bg-[#767680]/32 text-[#FF3B30] dark:text-[#FF453A] rounded-[14px] text-[13px] font-semibold tracking-tight transition-all duration-150 active:scale-[0.98] cursor-pointer focus-visible:outline-none"
          >
            {t('declineConnection')}
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="w-full h-11 bg-[#34C759] hover:bg-[#30D158] text-white rounded-[14px] text-[13px] font-semibold tracking-tight transition-all duration-150 shadow-sm active:scale-[0.98] cursor-pointer focus-visible:outline-none"
          >
            {t('acceptConnection')}
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
