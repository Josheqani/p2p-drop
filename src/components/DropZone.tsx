import { useRef, useState } from 'react'
import { useI18n } from '../lib/i18n'

interface DropZoneProps {
  onFilesSelected: (files: FileList | File[]) => void
  disabled?: boolean
}

export function DropZone({ onFilesSelected, disabled = false }: DropZoneProps) {
  const { t } = useI18n()
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    if (disabled) return
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      onFilesSelected(e.dataTransfer.files)
    }
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (!disabled) setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
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
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={() => !disabled && fileInputRef.current?.click()}
      onKeyDown={handleKeyDown}
      data-testid="drop-zone"
      className={`group relative rounded-[20px] p-7 text-center transition-all duration-200 cursor-pointer select-none border-2 border-dashed ${
        isDragOver
          ? 'border-[#007AFF] bg-[#007AFF]/8 dark:bg-[#0A84FF]/12 scale-[1.01]'
          : 'border-[#767680]/25 dark:border-[#767680]/35 bg-[#767680]/5 dark:bg-[#767680]/10 hover:border-[#007AFF]/60 dark:hover:border-[#0A84FF]/60 hover:bg-[#767680]/8 dark:hover:bg-[#767680]/16'
      } ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : ''} focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]`}
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
        {/* Apple AirDrop Style Center Icon */}
        <div
          className={`w-12 h-12 rounded-full mb-3 flex items-center justify-center transition-all duration-200 ${
            isDragOver
              ? 'bg-[#007AFF] text-white shadow-[0_4px_16px_rgba(0,122,255,0.4)] scale-110'
              : 'bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 text-[#007AFF] dark:text-[#0A84FF] group-hover:scale-105'
          }`}
        >
          <svg
            className="w-6 h-6"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <path d="M12 16V4m0 0l-4 4m4-4l4 4" />
            <path d="M20 16.5a4.5 4.5 0 0 1-4.5 4.5h-7A4.5 4.5 0 0 1 4 16.5" />
          </svg>
        </div>

        <p className="text-[13px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
          {t('dropFilesPrompt')}{' '}
          <span className="text-[#007AFF] dark:text-[#0A84FF] hover:underline cursor-pointer">
            {t('browse')}
          </span>
        </p>

        <p className="text-[11px] text-[#86868B] dark:text-[#98989D] mt-1 font-normal">
          {t('dropFilesSubtext')}
        </p>
      </div>
    </div>
  )
}
