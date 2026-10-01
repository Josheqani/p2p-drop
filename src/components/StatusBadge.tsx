import { PeerState } from '../lib/peer'
import { useI18n } from '../lib/i18n'

interface StatusBadgeProps {
  state: PeerState
}

export function StatusBadge({ state }: StatusBadgeProps) {
  const { t } = useI18n()

  const getStatusText = () => {
    switch (state) {
      case 'idle':
        return t('statusIdle')
      case 'creating':
        return t('statusCreating')
      case 'waiting':
        return t('statusWaiting')
      case 'connecting':
        return t('statusConnecting')
      case 'connected':
        return t('statusConnected')
      case 'failed':
        return t('statusFailed')
      case 'closed':
        return t('statusClosed')
      default:
        return state
    }
  }

  const getBadgeClasses = () => {
    switch (state) {
      case 'connected':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
      case 'failed':
        return 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border-rose-300 dark:border-rose-800'
      case 'connecting':
      case 'creating':
      case 'waiting':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border-amber-300 dark:border-amber-800'
      default:
        return 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-600'
    }
  }

  return (
    <div className="flex items-center space-x-2 rtl:space-x-reverse" aria-live="polite">
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{t('status')}</span>
      <span
        data-testid="connection-status"
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getBadgeClasses()}`}
      >
        <span
          className={`h-1.5 w-1.5 rounded-full me-1.5 ${
            state === 'connected'
              ? 'bg-emerald-500'
              : state === 'failed'
              ? 'bg-rose-500'
              : state === 'idle'
              ? 'bg-slate-400'
              : 'bg-amber-500 animate-pulse'
          }`}
        />
        {getStatusText()}
      </span>
    </div>
  )
}
