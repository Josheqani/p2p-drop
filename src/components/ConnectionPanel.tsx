import { useState, useEffect, useRef, useTransition } from 'react'
import { PeerConnection, PeerState } from '../lib/peer'
import { TransferManager, TransferItem } from '../lib/transfer'
import { useI18n } from '../lib/i18n'
import { StatusBadge } from './StatusBadge'
import { DropZone } from './DropZone'
import { TransferList } from './TransferList'
import { QrCodeDisplay } from './QrCodeDisplay'
import { QrScannerModal } from './QrScannerModal'
import { RoomCodePanel } from './RoomCodePanel'

export function ConnectionPanel() {
  const { t } = useI18n()
  const [connectionTab, setConnectionTab] = useState<'quick' | 'manual'>('quick')
  const [peer, setPeer] = useState<PeerConnection | null>(null)
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none')
  const [state, setState] = useState<PeerState>('idle')
  const [offerCode, setOfferCode] = useState('')
  const [answerCode, setAnswerCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // QR display & scanning states
  const [showOfferQr, setShowOfferQr] = useState(false)
  const [showAnswerQr, setShowAnswerQr] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [scannerTarget, setScannerTarget] = useState<'offer' | 'answer' | null>(null)

  const [transfers, setTransfers] = useState<TransferItem[]>([])
  const [, startTransition] = useTransition()

  const peerRef = useRef<PeerConnection | null>(null)
  const transferManagerRef = useRef<TransferManager | null>(null)

  useEffect(() => {
    return () => {
      if (transferManagerRef.current) {
        transferManagerRef.current.detachChannel()
      }
      if (peerRef.current) {
        peerRef.current.close()
      }
    }
  }, [])

  // beforeunload warning and screen WakeLock during active transfers
  useEffect(() => {
    const isTransferring = transfers.some((t) => t.status === 'transferring')
    if (!isTransferring) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = t('transferInProgressWarning')
    }

    window.addEventListener('beforeunload', handleBeforeUnload)

    let wakeLockSentinel: { release: () => Promise<void> } | null = null
    if (typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
      navigator.wakeLock
        .request('screen')
        .then((sentinel: { release: () => Promise<void> }) => {
          wakeLockSentinel = sentinel
        })
        .catch(() => {})
    }

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
      if (wakeLockSentinel) {
        wakeLockSentinel.release().catch(() => {})
      }
    }
  }, [transfers, t])

  const copyToClipboard = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(label)
      setTimeout(() => setCopied(null), 2500)
    } catch {
      setError('Failed to copy to clipboard')
    }
  }

  const setupPeerListeners = (p: PeerConnection) => {
    p.onStateChange((s) => {
      setState(s)
      if (s === 'connected' && p.dataChannel) {
        const tm = new TransferManager(p.dataChannel)
        transferManagerRef.current = tm
        tm.onTransfersChange((list) => {
          startTransition(() => {
            setTransfers(list)
          })
        })
      } else if (s === 'closed' || s === 'failed') {
        if (transferManagerRef.current) {
          transferManagerRef.current.detachChannel()
        }
      }
    })
  }

  const handlePeerConnected = (p: PeerConnection) => {
    peerRef.current = p
    setPeer(p)
    setState('connected')
    setupPeerListeners(p)
    if (p.dataChannel) {
      const tm = new TransferManager(p.dataChannel)
      transferManagerRef.current = tm
      tm.onTransfersChange((list) => {
        startTransition(() => {
          setTransfers(list)
        })
      })
    }
  }

  const handleCreate = async () => {
    setError(null)
    setMode('create')
    const p = new PeerConnection()
    peerRef.current = p
    setPeer(p)
    setupPeerListeners(p)

    try {
      const code = await p.createOffer()
      setOfferCode(code)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create offer')
    }
  }

  const handleJoin = () => {
    setError(null)
    setMode('join')
    setInputCode('')
    setAnswerCode('')
  }

  const handleAcceptOffer = async (codeToUse?: string) => {
    const targetCode = (codeToUse ?? inputCode).trim()
    if (!targetCode) return
    setError(null)
    const p = new PeerConnection()
    peerRef.current = p
    setPeer(p)
    setupPeerListeners(p)

    try {
      const ans = await p.acceptOffer(targetCode)
      setAnswerCode(ans)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process offer')
    }
  }

  const handleAcceptAnswer = async (codeToUse?: string) => {
    const targetCode = (codeToUse ?? inputCode).trim()
    if (!peer || !targetCode) return
    if (state === 'connected' || state === 'connecting') return
    setError(null)
    try {
      await peer.acceptAnswer(targetCode)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process answer')
    }
  }

  const handleFilesSelected = (files: FileList | File[]) => {
    if (!files || files.length === 0 || !transferManagerRef.current) return
    transferManagerRef.current.sendFiles(files)
  }

  const handleCancelTransfer = (id: string) => {
    if (transferManagerRef.current) {
      transferManagerRef.current.cancelTransfer(id)
    }
  }

  const handleReset = () => {
    if (transferManagerRef.current) {
      transferManagerRef.current.detachChannel()
      transferManagerRef.current = null
    }
    if (peerRef.current) {
      peerRef.current.close()
      peerRef.current = null
    }
    setPeer(null)
    setMode('none')
    setState('idle')
    setOfferCode('')
    setAnswerCode('')
    setInputCode('')
    setShowOfferQr(false)
    setShowAnswerQr(false)
    setIsScannerOpen(false)
    setError(null)
    setTransfers([])
  }

  const handleOpenScanner = (target: 'offer' | 'answer') => {
    setScannerTarget(target)
    setIsScannerOpen(true)
  }

  const handleScannedCode = (scanned: string) => {
    setInputCode(scanned)
    setIsScannerOpen(false)
    if (scannerTarget === 'offer') {
      handleAcceptOffer(scanned)
    } else if (scannerTarget === 'answer') {
      handleAcceptAnswer(scanned)
    }
  }

  return (
    <div className="space-y-5">
      {/* Top Header Controls: Status & Disconnect Button */}
      <div className="flex items-center justify-between">
        <StatusBadge state={state} />

        {state !== 'idle' && (
          <button
            type="button"
            onClick={handleReset}
            data-testid="reset-connection-btn"
            className="text-[12px] font-medium text-[#86868B] hover:text-[#FF3B30] dark:text-[#98989D] dark:hover:text-[#FF453A] transition-colors focus-visible:outline-none cursor-pointer"
          >
            {t('resetOrDisconnect')}
          </button>
        )}
      </div>

      {/* Error Callout */}
      {error && (
        <div
          role="alert"
          className="p-3.5 bg-[#FF3B30]/10 border border-[#FF3B30]/25 rounded-[16px] text-[#FF3B30] dark:text-[#FF453A] text-[12px] font-medium text-start animate-in fade-in"
        >
          {error}
        </div>
      )}

      {state === 'failed' && (
        <div
          role="alert"
          data-testid="connection-failed-explanation"
          className="p-4 bg-[#FF9500]/10 border border-[#FF9500]/25 rounded-[18px] text-[12px] space-y-1.5 text-start animate-in fade-in"
        >
          <div className="font-semibold flex items-center gap-1.5 text-[#B26A00] dark:text-[#FF9F0A]">
            <span>⚠️</span>
            <span>{t('statusFailed')}</span>
          </div>
          <p className="text-[12px] leading-relaxed text-[#1D1D1F]/80 dark:text-[#F5F5F7]/80">
            {t('connectionFailedExplanation')}
          </p>
        </div>
      )}

      {/* Apple HIG Segmented Control: Quick Code vs Manual & QR */}
      {state !== 'connected' && (
        <div className="flex items-center justify-center p-[3px] bg-[#767680]/12 dark:bg-[#767680]/24 rounded-[11px] max-w-[270px] mx-auto select-none">
          <button
            type="button"
            data-testid="tab-quick-code"
            onClick={() => {
              handleReset()
              setConnectionTab('quick')
            }}
            className={`flex-1 py-1 px-3 rounded-[8px] text-[12px] font-medium tracking-tight transition-all duration-150 cursor-pointer ${
              connectionTab === 'quick'
                ? 'bg-white dark:bg-[#636366] text-[#1D1D1F] dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-[#86868B] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
            }`}
          >
            ⚡️ {t('tabQuickCode')}
          </button>
          <button
            type="button"
            data-testid="tab-manual-qr"
            onClick={() => {
              handleReset()
              setConnectionTab('manual')
            }}
            className={`flex-1 py-1 px-3 rounded-[8px] text-[12px] font-medium tracking-tight transition-all duration-150 cursor-pointer ${
              connectionTab === 'manual'
                ? 'bg-white dark:bg-[#636366] text-[#1D1D1F] dark:text-white shadow-[0_1px_3px_rgba(0,0,0,0.1),0_1px_2px_rgba(0,0,0,0.06)]'
                : 'text-[#86868B] dark:text-[#98989D] hover:text-[#1D1D1F] dark:hover:text-white'
            }`}
          >
            📋 {t('tabManualQr')}
          </button>
        </div>
      )}

      {/* Tab 1: Quick Room Code with Host Approval */}
      {state !== 'connected' && connectionTab === 'quick' && (
        <RoomCodePanel onConnected={handlePeerConnected} onError={setError} />
      )}

      {/* Tab 2: Manual Copy/Paste & QR Code Flow (Offline Fallback) */}
      {state !== 'connected' && connectionTab === 'manual' && (
        <>
          {mode === 'none' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={handleCreate}
                data-testid="create-connection-btn"
                className="group p-5 bg-[#F8F8FA] dark:bg-[#2C2C2E] hover:bg-[#007AFF]/10 dark:hover:bg-[#0A84FF]/15 border border-black/[0.05] dark:border-white/[0.08] hover:border-[#007AFF]/40 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-150 text-start active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#007AFF]/12 dark:bg-[#0A84FF]/20 text-[#007AFF] dark:text-[#0A84FF] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10" />
                    <line x1="12" y1="8" x2="12" y2="16" />
                    <line x1="8" y1="12" x2="16" y2="12" />
                  </svg>
                </div>
                <div className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                  {t('createConnection')}
                </div>
                <p className="text-[12px] text-[#86868B] dark:text-[#98989D] mt-1 font-normal leading-relaxed">
                  {t('createConnectionDesc')}
                </p>
              </button>

              <button
                type="button"
                onClick={handleJoin}
                data-testid="join-connection-btn"
                className="group p-5 bg-[#F8F8FA] dark:bg-[#2C2C2E] hover:bg-[#007AFF]/10 dark:hover:bg-[#0A84FF]/15 border border-black/[0.05] dark:border-white/[0.08] hover:border-[#007AFF]/40 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-150 text-start active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
              >
                <div className="w-10 h-10 rounded-xl bg-[#34C759]/12 dark:bg-[#30D158]/20 text-[#248A3D] dark:text-[#30D158] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                    <polyline points="10 17 15 12 10 7" />
                    <line x1="15" y1="12" x2="3" y2="12" />
                  </svg>
                </div>
                <div className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                  {t('joinConnection')}
                </div>
                <p className="text-[12px] text-[#86868B] dark:text-[#98989D] mt-1 font-normal leading-relaxed">
                  {t('joinConnectionDesc')}
                </p>
              </button>
            </div>
          )}

          {/* Creator View */}
          {mode === 'create' && (
            <div className="space-y-4">
              <div className="space-y-1.5 text-start">
                <div className="flex items-center justify-between">
                  <label htmlFor="offer-code-output" className="text-[12px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                    {t('offerCodeLabel')}
                  </label>
                  {offerCode && (
                    <button
                      type="button"
                      data-testid="toggle-offer-qr-btn"
                      onClick={() => setShowOfferQr(!showOfferQr)}
                      className="text-[12px] text-[#007AFF] dark:text-[#0A84FF] hover:underline font-medium"
                    >
                      {showOfferQr ? t('hideQr') : t('showQr')}
                    </button>
                  )}
                </div>

                {showOfferQr && offerCode && (
                  <div className="py-1">
                    <QrCodeDisplay data={offerCode} />
                  </div>
                )}

                <div className="relative">
                  <textarea
                    id="offer-code-output"
                    readOnly
                    data-testid="offer-code-output"
                    value={offerCode || (state === 'creating' ? t('generatingOffer') : '')}
                    rows={3}
                    className="w-full text-[11px] font-mono p-3 pe-20 rounded-[16px] border border-black/[0.08] dark:border-white/[0.12] bg-[#F8F8FA] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
                  />
                  {offerCode && (
                    <button
                      type="button"
                      data-testid="copy-offer-btn"
                      onClick={() => copyToClipboard(offerCode, 'offer')}
                      className="absolute top-2.5 end-2.5 px-3 py-1 text-[11px] font-semibold rounded-full bg-[#007AFF] text-white hover:bg-[#0071E3] active:scale-95 shadow-xs transition"
                    >
                      {copied === 'offer' ? t('copied') : t('copy')}
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 text-start">
                <div className="flex items-center justify-between">
                  <label htmlFor="paste-answer-input" className="text-[12px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                    {t('pasteAnswerLabel')}
                  </label>
                  <button
                    type="button"
                    data-testid="scan-answer-qr-btn"
                    onClick={() => handleOpenScanner('answer')}
                    className="text-[12px] text-[#007AFF] dark:text-[#0A84FF] hover:underline font-medium"
                  >
                    📷 {t('scanQr')}
                  </button>
                </div>
                <textarea
                  id="paste-answer-input"
                  data-testid="paste-answer-input"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder={t('pasteAnswerPlaceholder')}
                  rows={3}
                  className="w-full text-[11px] font-mono p-3 rounded-[16px] border border-black/[0.08] dark:border-white/[0.12] bg-[#F8F8FA] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
                />
                <button
                  type="button"
                  onClick={() => handleAcceptAnswer()}
                  disabled={!inputCode.trim() || state === 'connecting'}
                  data-testid="connect-answer-btn"
                  className="w-full h-10 bg-[#34C759] hover:bg-[#30D158] disabled:opacity-40 text-white rounded-[14px] text-[13px] font-semibold tracking-tight transition-all shadow-sm active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none"
                >
                  {state === 'connecting' ? t('connecting') : t('connect')}
                </button>
              </div>
            </div>
          )}

          {/* Joiner View */}
          {mode === 'join' && (
            <div className="space-y-4 text-start">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label htmlFor="paste-offer-input" className="text-[12px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                    {t('pasteOfferLabel')}
                  </label>
                  <button
                    type="button"
                    data-testid="scan-offer-qr-btn"
                    onClick={() => handleOpenScanner('offer')}
                    className="text-[12px] text-[#007AFF] dark:text-[#0A84FF] hover:underline font-medium"
                  >
                    📷 {t('scanQr')}
                  </button>
                </div>
                <textarea
                  id="paste-offer-input"
                  data-testid="paste-offer-input"
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder={t('pasteOfferPlaceholder')}
                  rows={3}
                  className="w-full text-[11px] font-mono p-3 rounded-[16px] border border-black/[0.08] dark:border-white/[0.12] bg-[#F8F8FA] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
                />
                {!answerCode && (
                  <button
                    type="button"
                    onClick={() => handleAcceptOffer()}
                    disabled={!inputCode.trim() || state === 'creating'}
                    data-testid="generate-answer-btn"
                    className="w-full h-10 bg-[#007AFF] hover:bg-[#0071E3] disabled:opacity-40 text-white rounded-[14px] text-[13px] font-semibold tracking-tight transition-all shadow-sm active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none"
                  >
                    {state === 'creating' ? t('generatingAnswer') : t('generateAnswer')}
                  </button>
                )}
              </div>

              {answerCode && (
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label htmlFor="answer-code-output" className="text-[12px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
                      {t('answerCodeLabel')}
                    </label>
                    <button
                      type="button"
                      data-testid="toggle-answer-qr-btn"
                      onClick={() => setShowAnswerQr(!showAnswerQr)}
                      className="text-[12px] text-[#007AFF] dark:text-[#0A84FF] hover:underline font-medium"
                    >
                      {showAnswerQr ? t('hideQr') : t('showQr')}
                    </button>
                  </div>

                  {showAnswerQr && (
                    <div className="py-1">
                      <QrCodeDisplay data={answerCode} />
                    </div>
                  )}

                  <div className="relative">
                    <textarea
                      id="answer-code-output"
                      readOnly
                      data-testid="answer-code-output"
                      value={answerCode}
                      rows={3}
                      className="w-full text-[11px] font-mono p-3 pe-20 rounded-[16px] border border-black/[0.08] dark:border-white/[0.12] bg-[#F8F8FA] dark:bg-[#2C2C2E] text-[#1D1D1F] dark:text-[#F5F5F7] resize-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
                    />
                    <button
                      type="button"
                      data-testid="copy-answer-btn"
                      onClick={() => copyToClipboard(answerCode, 'answer')}
                      className="absolute top-2.5 end-2.5 px-3 py-1 text-[11px] font-semibold rounded-full bg-[#007AFF] text-white hover:bg-[#0071E3] active:scale-95 shadow-xs transition"
                    >
                      {copied === 'answer' ? t('copied') : t('copy')}
                    </button>
                  </div>
                  <p className="mt-1 text-[12px] text-[#86868B] dark:text-[#98989D]">
                    {t('waitingForCreator')}
                  </p>
                </div>
              )}
            </div>
          )}
        </>
      )}

      {/* Connected View: AirDrop File Transfer */}
      {state === 'connected' && (
        <div className="space-y-5 pt-3 border-t border-black/[0.06] dark:border-white/[0.08] animate-in fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
              {t('p2pFileTransfer')}
            </h2>
            <span className="text-[12px] text-[#34C759] font-medium flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#34C759]" />
              {t('statusConnected')}
            </span>
          </div>

          {/* Drag & Drop Area */}
          <DropZone onFilesSelected={handleFilesSelected} />

          {/* Transfer List */}
          <TransferList transfers={transfers} onCancel={handleCancelTransfer} />
        </div>
      )}

      {/* Camera QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleScannedCode}
      />
    </div>
  )
}
