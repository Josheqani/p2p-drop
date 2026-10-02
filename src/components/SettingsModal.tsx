import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useI18n } from '../lib/i18n'
import {
  DEFAULT_ICE_SERVERS,
  getStoredIceServers,
  setStoredIceServers,
  isTurnRelayEnabled,
  setTurnRelayEnabled,
  resetIceConfig,
} from '../lib/iceConfig'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

export function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
  const { t } = useI18n()
  const [turnEnabled, setTurnEnabledState] = useState(true)
  const [customJson, setCustomJson] = useState('')
  const [jsonError, setJsonError] = useState<string | null>(null)
  const [savedNotice, setSavedNotice] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    if (isOpen) {
      setTurnEnabledState(isTurnRelayEnabled())
      const stored = getStoredIceServers()
      setCustomJson(JSON.stringify(stored, null, 2))
      setJsonError(null)
      setSavedNotice(false)
    }
  }, [isOpen])

  if (!isOpen || !mounted) return null

  const handleToggleTurn = (checked: boolean) => {
    setTurnEnabledState(checked)
    setTurnRelayEnabled(checked)
  }

  const handleSave = () => {
    try {
      const parsed = JSON.parse(customJson)
      if (!Array.isArray(parsed)) {
        setJsonError('Expected a JSON array of RTCIceServer objects')
        return
      }
      setStoredIceServers(parsed)
      setTurnRelayEnabled(turnEnabled)
      setJsonError(null)
      setSavedNotice(true)
      setTimeout(() => setSavedNotice(false), 2000)
    } catch (err) {
      setJsonError(err instanceof Error ? err.message : 'Invalid JSON')
    }
  }

  const handleReset = () => {
    resetIceConfig()
    setTurnEnabledState(true)
    setCustomJson(JSON.stringify(DEFAULT_ICE_SERVERS, null, 2))
    setJsonError(null)
    setSavedNotice(true)
    setTimeout(() => setSavedNotice(false), 2000)
  }

  const modalContent = (
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-[480px] max-h-[85vh] flex flex-col rounded-[24px] bg-white/95 dark:bg-[#1E1E20]/95 backdrop-blur-2xl shadow-[0_24px_64px_rgba(0,0,0,0.3)] border border-black/[0.08] dark:border-white/[0.12] text-start animate-in zoom-in-95 duration-150 overflow-hidden">
        {/* Navigation Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-3.5 border-b border-black/[0.06] dark:border-white/[0.08] shrink-0 bg-transparent">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-full bg-[#767680]/12 dark:bg-[#767680]/24 flex items-center justify-center text-[#007AFF] dark:text-[#0A84FF]">
              <svg className="w-4.5 h-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="3" />
                <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
              </svg>
            </div>
            <h2 id="settings-modal-title" className="text-[17px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
              {t('iceSettings')}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-7 h-7 rounded-full bg-[#767680]/12 dark:bg-[#767680]/24 text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] flex items-center justify-center transition-colors focus-visible:outline-none cursor-pointer"
            aria-label={t('close')}
          >
            ✕
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1 overscroll-contain">
          <p className="text-[12px] text-[#86868B] dark:text-[#98989D] leading-relaxed">
            {t('iceSettingsDesc')}
          </p>

          {/* TURN Relay Toggle */}
          <div className="rounded-[18px] bg-[#F8F8FA] dark:bg-[#2C2C2E] p-4 border border-black/[0.04] dark:border-white/[0.06]">
            <div className="flex items-center justify-between cursor-pointer" onClick={() => handleToggleTurn(!turnEnabled)}>
              <div className="pe-4">
                <div className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] flex items-center gap-2">
                  <span>{t('turnRelay')}</span>
                  <span className="text-[10px] font-semibold uppercase tracking-wider bg-[#34C759]/12 text-[#248A3D] dark:bg-[#30D158]/20 dark:text-[#30D158] px-2 py-0.5 rounded-full">
                    Recommended
                  </span>
                </div>
                <p className="text-[12px] text-[#86868B] dark:text-[#98989D] mt-0.5 leading-snug">
                  {t('turnRelayDesc')}
                </p>
              </div>

              {/* iOS Switch Control */}
              <button
                type="button"
                role="switch"
                aria-checked={turnEnabled}
                onClick={(e) => {
                  e.stopPropagation()
                  handleToggleTurn(!turnEnabled)
                }}
                className={`relative shrink-0 inline-flex h-[28px] w-[48px] items-center rounded-full transition-colors duration-200 cursor-pointer focus-visible:outline-none ${
                  turnEnabled ? 'bg-[#34C759]' : 'bg-[#767680]/25 dark:bg-[#767680]/40'
                }`}
              >
                <span
                  className={`inline-block h-[24px] w-[24px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.2)] transform transition-transform duration-200 ${
                    turnEnabled ? 'translate-x-[22px]' : 'translate-x-[2px]'
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Active Servers Overview */}
          <div className="space-y-2">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] dark:text-[#98989D] px-1">
              {t('activeIceServers')}
            </label>
            <div className="text-[12px] space-y-1.5 bg-[#F8F8FA] dark:bg-[#2C2C2E] p-3.5 rounded-[16px] border border-black/[0.04] dark:border-white/[0.06] text-[#1D1D1F] dark:text-[#F5F5F7] font-mono">
              <div className="flex items-center justify-between">
                <span className="truncate">stun:stun.cloudflare.com:3478</span>
                <span className="text-[10px] font-sans font-medium bg-[#FF9500]/12 text-[#B26A00] dark:bg-[#FF9F0A]/20 dark:text-[#FF9F0A] px-2 py-0.5 rounded-full">
                  Cloudflare STUN
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="truncate">stun:openrelay.metered.ca:80 / 443</span>
                <span className="text-[10px] font-sans font-medium bg-[#007AFF]/12 text-[#007AFF] dark:bg-[#0A84FF]/20 dark:text-[#0A84FF] px-2 py-0.5 rounded-full">
                  Port 80/443
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="truncate">stun:stun.l.google.com:19302</span>
                <span className="text-[10px] font-sans font-medium bg-[#767680]/12 text-[#636366] dark:text-[#98989D] px-2 py-0.5 rounded-full">
                  Google STUN
                </span>
              </div>
              {turnEnabled && (
                <div className="flex items-center justify-between text-[#007AFF] dark:text-[#0A84FF]">
                  <span className="truncate">turn:openrelay.metered.ca (TCP/UDP)</span>
                  <span className="text-[10px] font-sans font-medium bg-[#007AFF]/12 text-[#007AFF] dark:bg-[#0A84FF]/20 dark:text-[#0A84FF] px-2 py-0.5 rounded-full">
                    OpenRelay TURN
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Custom JSON configuration */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] dark:text-[#98989D] px-1 block">
              {t('customIceServers')}
            </label>
            <textarea
              value={customJson}
              onChange={(e) => {
                setCustomJson(e.target.value)
                setJsonError(null)
              }}
              rows={4}
              className="w-full font-mono text-[11px] rounded-[16px] border border-black/[0.08] dark:border-white/[0.12] bg-[#F8F8FA] dark:bg-[#2C2C2E] p-3 text-[#1D1D1F] dark:text-[#F5F5F7] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
            />
            {jsonError && (
              <p className="text-[12px] text-[#FF3B30] dark:text-[#FF453A] font-medium px-1">
                {jsonError}
              </p>
            )}
          </div>
        </div>

        {/* Fixed Footer Actions */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-black/[0.06] dark:border-white/[0.08] shrink-0 bg-white/70 dark:bg-[#1E1E20]/70 backdrop-blur-xl">
          <button
            type="button"
            onClick={handleReset}
            className="text-[13px] text-[#007AFF] dark:text-[#0A84FF] hover:underline font-medium focus-visible:outline-none cursor-pointer"
          >
            {t('resetDefaults')}
          </button>

          <div className="flex items-center gap-2">
            {savedNotice && (
              <span className="text-[12px] text-[#34C759] font-medium">
                ✓ {t('saved')}
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="h-9 px-4 rounded-full bg-[#007AFF] hover:bg-[#0071E3] active:scale-95 text-[13px] font-semibold text-white transition-all shadow-xs focus-visible:outline-none cursor-pointer"
            >
              {t('save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-9 px-4 rounded-full bg-[#767680]/12 hover:bg-[#767680]/18 dark:bg-[#767680]/24 text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] transition-all focus-visible:outline-none cursor-pointer"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
