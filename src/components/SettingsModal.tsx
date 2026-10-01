import { useState, useEffect } from 'react'
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

  useEffect(() => {
    if (isOpen) {
      setTurnEnabledState(isTurnRelayEnabled())
      const stored = getStoredIceServers()
      setCustomJson(JSON.stringify(stored, null, 2))
      setJsonError(null)
      setSavedNotice(false)
    }
  }, [isOpen])

  if (!isOpen) return null

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

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div className="w-full max-w-lg rounded-2xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 text-start animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            <span className="text-xl">⚙️</span>
            <h2 id="settings-modal-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t('iceSettings')}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label={t('close')}
          >
            ✕
          </button>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-400">
          {t('iceSettingsDesc')}
        </p>

        {/* TURN Relay Toggle */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
          <label className="flex items-center justify-between cursor-pointer">
            <div>
              <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                <span>🔄</span>
                <span>{t('turnRelay')}</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 px-1.5 py-0.5 rounded">
                  Recommended
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                {t('turnRelayDesc')}
              </p>
            </div>
            <input
              type="checkbox"
              checked={turnEnabled}
              onChange={(e) => handleToggleTurn(e.target.checked)}
              className="h-5 w-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer ms-3"
            />
          </label>
        </div>

        {/* Active Built-in Servers Overview */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
            <span>🌐</span>
            <span>{t('activeIceServers')}</span>
          </label>
          <div className="text-xs space-y-1 bg-slate-100 dark:bg-slate-950/70 p-3 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 font-mono">
            <div className="flex items-center justify-between">
              <span>stun:stun.cloudflare.com:3478</span>
              <span className="text-[10px] bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 px-1.5 py-0.2 rounded font-sans">
                Cloudflare STUN
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>stun:openrelay.metered.ca:80 / 443</span>
              <span className="text-[10px] bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.2 rounded font-sans">
                Port 80/443
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>stun:stun.l.google.com:19302</span>
              <span className="text-[10px] bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-300 px-1.5 py-0.2 rounded font-sans">
                Google STUN
              </span>
            </div>
            {turnEnabled && (
              <div className="flex items-center justify-between text-indigo-600 dark:text-indigo-400">
                <span>turn:openrelay.metered.ca (TCP/UDP)</span>
                <span className="text-[10px] bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 px-1.5 py-0.2 rounded font-sans">
                  OpenRelay TURN
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Custom JSON configuration */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 block">
            {t('customIceServers')}
          </label>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {t('customIceServersDesc')}
          </p>
          <textarea
            value={customJson}
            onChange={(e) => {
              setCustomJson(e.target.value)
              setJsonError(null)
            }}
            rows={5}
            className="w-full font-mono text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-950 p-2.5 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            dir="ltr"
          />
          {jsonError && (
            <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">
              {jsonError}
            </p>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 transition"
          >
            {t('resetDefaults')}
          </button>

          <div className="flex items-center gap-2">
            {savedNotice && (
              <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                {t('saved')}
              </span>
            )}
            <button
              type="button"
              onClick={handleSave}
              className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 transition"
            >
              {t('save')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 dark:border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            >
              {t('close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
