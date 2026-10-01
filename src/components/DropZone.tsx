import { useRef } from 'react'
import { useI18n } from '../lib/i18n'

interface DropZoneProps {
  onFilesSelected: (files: FileList | File[]) => void
  disabled?: boolean
}

export function DropZone({ onFilesSelected, disabled = false }: DropZoneProps) {
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (disabled) return
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      fileInputRef.current?.click()
    }
  }

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={`${t('dropFilesPrompt')} ${t('browse')}`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      onKeyDown={handleKeyDown}
      data-testid="drop-zone"
      className={`border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl p-6 text-center transition cursor-pointer bg-slate-50/50 dark:bg-slate-800/50 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 ${
        disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''
      }`}
    >
      <input
        type="file"
        multiple
        ref={fileInputRef}
        data-testid="file-picker-input"
        className="hidden"
        onChange={(e) => {
          if (e.target.files) {
            onFilesSelected(e.target.files)
            e.target.value = ''
          }
        }}
      />
      <div className="flex flex-col items-center">
        <svg
          className="w-8 h-8 text-indigo-500 mb-2"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={1.5}
            d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
          />
        </svg>
        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
          {t('dropFilesPrompt')}{' '}
          <span className="text-indigo-600 dark:text-indigo-400 underline">{t('browse')}</span>
        </p>
        <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
          {t('dropFilesSubtext')}
        </p>
      </div>
    </div>
  )
}
