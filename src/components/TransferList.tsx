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
    <div className="space-y-3" data-testid="transfers-list">
      <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
        {t('transfers')} ({transfers.length})
      </h3>
      <div className="space-y-2 max-h-64 overflow-y-auto pe-1" role="list">
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
              className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs space-y-2 text-start"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0">
                  <span
                    className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                      item.direction === 'send'
                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                    }`}
                  >
                    {item.direction === 'send' ? t('send') : t('recv')}
                  </span>
                  <span
                    className="font-medium truncate max-w-[180px] sm:max-w-[220px]"
                    title={item.name}
                  >
                    {item.name}
                  </span>
                </div>
                <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                  {formatBytes(item.size)}
                </span>
              </div>

              {/* Progress Bar */}
              <div
                className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden"
                role="progressbar"
                aria-valuenow={percent}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={`h-1.5 rounded-full transition-all duration-200 ${
                    item.status === 'completed'
                      ? 'bg-emerald-500'
                      : item.status === 'failed' || item.status === 'cancelled'
                      ? 'bg-rose-500'
                      : 'bg-indigo-600'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>

              {/* Status Details */}
              <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                <div>
                  {item.status === 'transferring' && (
                    <span>
                      {percent}% • {formatSpeed(item.speed)} • {formatTime(item.remainingSeconds)} {t('left')}
                    </span>
                  )}
                  {item.status === 'queued' && (
                    <span className="italic">{t('queued')}</span>
                  )}
                  {item.status === 'completed' && (
                    <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                      {t('completed')}
                    </span>
                  )}
                  {item.status === 'cancelled' && (
                    <span className="text-amber-600 dark:text-amber-400 font-medium">
                      {t('cancelled')}
                    </span>
                  )}
                  {item.status === 'failed' && (
                    <span
                      className="text-rose-600 dark:text-rose-400 font-medium"
                      title={item.error}
                    >
                      {t('failed')} ({item.error || 'Error'})
                    </span>
                  )}
                </div>

                <div className="flex items-center space-x-2 rtl:space-x-reverse">
                  {(item.status === 'transferring' || item.status === 'queued') && (
                    <button
                      onClick={() => onCancel(item.id)}
                      className="text-rose-600 dark:text-rose-400 hover:underline font-medium text-[11px] focus:outline-hidden focus:ring-1 focus:ring-rose-500 rounded"
                    >
                      {t('cancel')}
                    </button>
                  )}
                  {item.direction === 'receive' && item.status === 'completed' && item.blobUrl && (
                    <a
                      href={item.blobUrl}
                      download={item.name}
                      data-testid="download-file-btn"
                      className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium shadow-xs focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
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
