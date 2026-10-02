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
        return 'bg-[#34C759]/12 text-[#248A3D] dark:bg-[#30D158]/18 dark:text-[#30D158] border-[#34C759]/25'
      case 'failed':
        return 'bg-[#FF3B30]/12 text-[#D70015] dark:bg-[#FF453A]/18 dark:text-[#FF453A] border-[#FF3B30]/25'
      case 'connecting':
      case 'creating':
      case 'waiting':
        return 'bg-[#FF9500]/12 text-[#B26A00] dark:bg-[#FF9F0A]/18 dark:text-[#FF9F0A] border-[#FF9500]/25'
      default:
        return 'bg-[#767680]/12 text-[#636366] dark:text-[#8E8E93] border-transparent'
    }
  }

  const getDotClasses = () => {
    switch (state) {
      case 'connected':
        return 'bg-[#34C759] dark:bg-[#30D158]'
      case 'failed':
        return 'bg-[#FF3B30] dark:bg-[#FF453A]'
      case 'idle':
        return 'bg-[#8E8E93]'
      default:
        return 'bg-[#FF9500] dark:bg-[#FF9F0A] animate-pulse'
    }
  }

  return (
    <div className="flex items-center space-x-2" aria-live="polite">
      <span className="text-[12px] font-medium text-[#86868B] dark:text-[#98989D]">
        {t('status')}
      </span>
      <span
        data-testid="connection-status"
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border transition-colors ${getBadgeClasses()}`}
      >
        <span className={`h-1.5 w-1.5 rounded-full me-1.5 ${getDotClasses()}`} />
        {getStatusText()}
      </span>
    </div>
  )
}
