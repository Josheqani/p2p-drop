import { useState, useEffect, useRef, useTransition } from 'react'
import { PeerConnection, PeerState } from '../lib/peer'
import { TransferManager, TransferItem } from '../lib/transfer'
import { useI18n } from '../lib/i18n'
import { StatusBadge } from './StatusBadge'
import { DropZone } from './DropZone'
import { TransferList } from './TransferList'

export function ConnectionPanel() {
  const { t } = useI18n()
  const [peer, setPeer] = useState<PeerConnection | null>(null)
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none')
  const [state, setState] = useState<PeerState>('idle')
  const [offerCode, setOfferCode] = useState('')
  const [answerCode, setAnswerCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

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

  const handleAcceptOffer = async () => {
    if (!inputCode.trim()) return
    setError(null)
    const p = new PeerConnection()
    peerRef.current = p
    setPeer(p)
    setupPeerListeners(p)

    try {
      const ans = await p.acceptOffer(inputCode.trim())
      setAnswerCode(ans)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process offer')
    }
  }

  const handleAcceptAnswer = async () => {
    if (!peer || !inputCode.trim()) return
    setError(null)
    try {
      await peer.acceptAnswer(inputCode.trim())
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
    setError(null)
    setTransfers([])
  }

  return (
    <div className="space-y-6 text-start">
      {/* State badge and actions */}
      <div className="flex items-center justify-between">
        <StatusBadge state={state} />

        {mode !== 'none' && (
          <button
            onClick={handleReset}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline focus:outline-hidden focus:ring-1 focus:ring-slate-400 rounded"
          >
            {t('resetOrDisconnect')}
          </button>
        )}
      </div>

      {error && (
        <div
          role="alert"
          className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-lg text-rose-800 dark:text-rose-300 text-xs"
        >
          {error}
        </div>
      )}

      {/* Mode selection */}
      {mode === 'none' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={handleCreate}
            data-testid="create-connection-btn"
            className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm transition text-center focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900"
          >
            {t('createConnection')}
            <span className="block text-xs text-indigo-100 mt-1">{t('createConnectionDesc')}</span>
          </button>
          <button
            onClick={handleJoin}
            data-testid="join-connection-btn"
            className="p-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl font-medium shadow-sm transition text-center focus:outline-hidden focus:ring-2 focus:ring-slate-400"
          >
            {t('joinConnection')}
            <span className="block text-xs text-slate-600 dark:text-slate-400 mt-1">
              {t('joinConnectionDesc')}
            </span>
          </button>
        </div>
      )}

      {/* Creator View */}
      {mode === 'create' && state !== 'connected' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="offer-code-output" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('offerCodeLabel')}
            </label>
            <div className="relative">
              <textarea
                id="offer-code-output"
                readOnly
                data-testid="offer-code-output"
                value={offerCode || (state === 'creating' ? t('generatingOffer') : '')}
                rows={3}
                className="w-full text-xs font-mono p-2.5 pe-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              />
              {offerCode && (
                <button
                  type="button"
                  data-testid="copy-offer-btn"
                  onClick={() => copyToClipboard(offerCode, 'offer')}
                  className="absolute top-2 end-2 px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
                >
                  {copied === 'offer' ? t('copied') : t('copy')}
                </button>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="paste-answer-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('pasteAnswerLabel')}
            </label>
            <textarea
              id="paste-answer-input"
              data-testid="paste-answer-input"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder={t('pasteAnswerPlaceholder')}
              rows={3}
              className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleAcceptAnswer}
              disabled={!inputCode.trim() || state === 'connecting'}
              data-testid="connect-answer-btn"
              className="mt-2 w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
            >
              {state === 'connecting' ? t('connecting') : t('connect')}
            </button>
          </div>
        </div>
      )}

      {/* Joiner View */}
      {mode === 'join' && state !== 'connected' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="paste-offer-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              {t('pasteOfferLabel')}
            </label>
            <textarea
              id="paste-offer-input"
              data-testid="paste-offer-input"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder={t('pasteOfferPlaceholder')}
              rows={3}
              className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
            {!answerCode && (
              <button
                onClick={handleAcceptOffer}
                disabled={!inputCode.trim() || state === 'creating'}
                data-testid="generate-answer-btn"
                className="mt-2 w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
              >
                {state === 'creating' ? t('generatingAnswer') : t('generateAnswer')}
              </button>
            )}
          </div>

          {answerCode && (
            <div>
              <label htmlFor="answer-code-output" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                {t('answerCodeLabel')}
              </label>
              <div className="relative">
                <textarea
                  id="answer-code-output"
                  readOnly
                  data-testid="answer-code-output"
                  value={answerCode}
                  rows={3}
                  className="w-full text-xs font-mono p-2.5 pe-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  data-testid="copy-answer-btn"
                  onClick={() => copyToClipboard(answerCode, 'answer')}
                  className="absolute top-2 end-2 px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-indigo-400"
                >
                  {copied === 'answer' ? t('copied') : t('copy')}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                {t('waitingForCreator')}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Connected View: File Transfer Protocol */}
      {state === 'connected' && (
        <div className="space-y-5 pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              {t('p2pFileTransfer')}
            </h2>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">● {t('statusConnected')}</span>
          </div>

          {/* Drag & Drop Area */}
          <DropZone onFilesSelected={handleFilesSelected} />

          {/* Transfer List */}
          <TransferList transfers={transfers} onCancel={handleCancelTransfer} />
        </div>
      )}
    </div>
  )
}
