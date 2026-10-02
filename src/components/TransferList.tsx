import { TransferItem } from '../lib/transfer'
import { formatBytes, formatSpeed, formatTime } from '../lib/format'
import { useI18n } from '../lib/i18n'

interface TransferListProps {
  transfers: TransferItem[]
  onCancel: (id: string) => void
}

export function TransferList({ transfers, onCancel }: TransferListProps) {
  const { t } = useI18n()

  if (transfers.length === 0) {
    return null
  }

  return (
    <div className="space-y-2.5" data-testid="transfers-list">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-[11px] font-semibold text-[#86868B] dark:text-[#98989D] uppercase tracking-wider">
          {t('transfers')} ({transfers.length})
        </h3>
      </div>

      <div className="space-y-2.5 max-h-64 overflow-y-auto pe-1" role="list">
        {transfers.map((item) => {
          const percent =
            item.size > 0
              ? Math.min(100, Math.round((item.transferred / item.size) * 100))
              : 0

          return (
            <div
              key={item.id}
              role="listitem"
              data-testid={`transfer-item-${item.id}`}
              className="p-3.5 bg-[#F8F8FA] dark:bg-[#2C2C2E] border border-black/[0.04] dark:border-white/[0.06] rounded-[16px] shadow-[0_1px_3px_rgba(0,0,0,0.02)] space-y-2.5 text-start transition-all"
            >
              <div className="flex items-center justify-between text-xs gap-2">
                <div className="flex items-center space-x-2 min-w-0">
                  <span
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${
                      item.direction === 'send'
                        ? 'bg-[#007AFF]/12 text-[#007AFF] dark:bg-[#0A84FF]/20 dark:text-[#0A84FF]'
                        : 'bg-[#34C759]/12 text-[#248A3D] dark:bg-[#30D158]/20 dark:text-[#30D158]'
                    }`}
                  >
                    {item.direction === 'send' ? t('send') : t('recv')}
                  </span>
                  <span
                    className="font-medium text-[13px] text-[#1D1D1F] dark:text-[#F5F5F7] truncate max-w-[180px] sm:max-w-[220px]"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                </div>
                <span className="text-[#86868B] dark:text-[#98989D] text-[11px] font-mono shrink-0">
                  {formatBytes(item.size)}
                </span>
              </div>

              {/* Apple HIG Progress Bar */}
              <div
                className="w-full bg-[#767680]/15 dark:bg-[#767680]/30 rounded-full h-[5px] overflow-hidden"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-full rounded-full transition-all duration-200 ${
                    item.status === 'completed'
                      ? 'bg-[#34C759]'
                      : item.status === 'failed' || item.status === 'cancelled'
                      ? 'bg-[#FF3B30]'
                      : 'bg-[#007AFF] dark:bg-[#0A84FF]'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              {/* Status Details */}
              <div className="flex items-center justify-between text-[11px] text-[#86868B] dark:text-[#98989D]">
                <div>
                  {item.status === 'transferring' && (
                    <span className="font-medium text-[#1D1D1F] dark:text-[#F5F5F7]">
                      {percent}% • {formatSpeed(item.speed)} • {formatTime(item.remainingSeconds)} {t('left')}
                    </span>
                  )}
                  {item.status === 'queued' && (
                    <span className="italic">{t('queued')}</span>
                  )}
                  {item.status === 'completed' && (
                    <span className="text-[#34C759] dark:text-[#30D158] font-medium flex items-center gap-1">
                      <span>✓</span>
                      <span>{t('completed')}</span>
                    </span>
                  )}
                  {item.status === 'cancelled' && (
                    <span className="text-[#FF9500] dark:text-[#FF9F0A] font-medium">
                      {t('cancelled')}
                    </span>
                  )}
                  {item.status === 'failed' && (
                    <span
                      className="text-[#FF3B30] dark:text-[#FF453A] font-medium"
                      title={item.error}
                    >
                      {t('failed')} ({item.error || 'Error'})
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2">
                  {(item.status === 'transferring' || item.status === 'queued') && (
                    <button
                      type="button"
                      onClick={() => onCancel(item.id)}
                      className="text-[#FF3B30] dark:text-[#FF453A] hover:underline font-medium text-[11px] focus-visible:outline-none"
                    >
                      {t('cancel')}
                    </button>
                  )}
                  {item.direction === 'receive' && item.status === 'completed' && item.blobUrl && (
                    <a
                      href={item.blobUrl}
                      download={item.name}
                      data-testid="download-file-btn"
                      className="px-3 py-1 bg-[#34C759] hover:bg-[#30D158] active:scale-95 text-white rounded-full text-[11px] font-semibold shadow-xs transition-transform focus-visible:outline-none"
                    >
                      {t('download')}
                    </a>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
