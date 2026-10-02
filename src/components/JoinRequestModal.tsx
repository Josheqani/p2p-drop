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

  if (!isOpen || !joinerInfo) return null

  const getDeviceIcon = (type: DeviceInfo['deviceType']) => {
    switch (type) {
      case 'mobile':
        return '📱'
      case 'tablet':
        return '📟'
      case 'desktop':
      default:
        return '💻'
    }
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-request-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 text-start animate-in zoom-in-95 duration-150">
        <div className="flex items-center space-x-3 rtl:space-x-reverse">
          <div className="h-12 w-12 rounded-xl bg-indigo-100 dark:bg-indigo-950 flex items-center justify-center text-2xl animate-bounce">
            {getDeviceIcon(joinerInfo.deviceType)}
          </div>
          <div>
            <h2 id="join-request-title" className="text-lg font-bold text-slate-900 dark:text-slate-100">
              {t('incomingRequestTitle')}
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('incomingRequestDesc')}
            </p>
          </div>
        </div>

        {/* Device Info Card */}
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200/80 dark:border-slate-700/60 space-y-3">
          <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <span>{joinerInfo.displayName}</span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-200/60 dark:border-slate-700/50">
            <div>
              <span className="text-slate-500 dark:text-slate-400 block">{t('device')}</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {joinerInfo.deviceModel}
              </span>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 block">{t('operatingSystem')}</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {joinerInfo.osName} {joinerInfo.osVersion}
              </span>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 block">{t('browser')}</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {joinerInfo.browserName} {joinerInfo.browserVersion}
              </span>
            </div>

            <div>
              <span className="text-slate-500 dark:text-slate-400 block">{t('screen')}</span>
              <span className="font-medium text-slate-800 dark:text-slate-200">
                {joinerInfo.screenResolution}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-2">
          <button
            type="button"
            onClick={onDecline}
            className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            {t('declineConnection')}
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {t('acceptConnection')}
          </button>
        </div>
      </div>
    </div>
  )
}
