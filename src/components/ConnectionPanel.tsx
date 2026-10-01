import { useState, useEffect, useRef, useTransition } from 'react'
import { PeerConnection, PeerState } from '../lib/peer'
import { TransferManager, TransferItem } from '../lib/transfer'
import { formatBytes, formatSpeed, formatTime } from '../lib/format'

export function ConnectionPanel() {
  const [peer, setPeer] = useState<PeerConnection | null>(null)
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none')
  const [state, setState] = useState<PeerState>('idle')
  const [offerCode, setOfferCode] = useState('')
  const [answerCode, setAnswerCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // File transfers state
  const [transfers, setTransfers] = useState<TransferItem[]>([])
  const [, startTransition] = useTransition()

  const peerRef = useRef<PeerConnection | null>(null)
  const transferManagerRef = useRef<TransferManager | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

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

  const handleFilesSelected = (files: FileList | null) => {
    if (!files || files.length === 0 || !transferManagerRef.current) return
    transferManagerRef.current.sendFiles(files)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (!transferManagerRef.current) return
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      transferManagerRef.current.sendFiles(e.dataTransfer.files)
    }
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
      {/* State badge */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2 rtl:space-x-reverse">
          <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Status:</span>
          <span
            data-testid="connection-status"
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
              state === 'connected'
                ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                : state === 'failed'
                ? 'bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300 border border-rose-300 dark:border-rose-800'
                : state === 'connecting' || state === 'creating' || state === 'waiting'
                ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-800'
                : 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-300'
            }`}
          >
            {state}
          </span>
        </div>

        {mode !== 'none' && (
          <button
            onClick={handleReset}
            className="text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 underline"
          >
            Reset / Disconnect
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
            className="p-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium shadow-sm transition text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
          >
            Create connection
            <span className="block text-xs text-indigo-100 mt-1">Start a room to send or receive</span>
          </button>
          <button
            onClick={handleJoin}
            data-testid="join-connection-btn"
            className="p-4 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-xl font-medium shadow-sm transition text-center focus:outline-none focus:ring-2 focus:ring-slate-400"
          >
            Join connection
            <span className="block text-xs text-slate-600 dark:text-slate-400 mt-1">Join with an offer code</span>
          </button>
        </div>
      )}

      {/* Creator View */}
      {mode === 'create' && state !== 'connected' && (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              1. Your Offer Code (send this to the peer)
            </label>
            <div className="relative">
              <textarea
                readOnly
                data-testid="offer-code-output"
                value={offerCode || (state === 'creating' ? 'Generating offer...' : '')}
                rows={3}
                className="w-full text-xs font-mono p-2.5 pe-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none"
              />
              {offerCode && (
                <button
                  type="button"
                  data-testid="copy-offer-btn"
                  onClick={() => copyToClipboard(offerCode, 'offer')}
                  className="absolute top-2 end-2 px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                >
                  {copied === 'offer' ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="paste-answer-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              2. Paste Answer Code from peer
            </label>
            <textarea
              id="paste-answer-input"
              data-testid="paste-answer-input"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Paste the answer code here..."
              rows={3}
              className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              onClick={handleAcceptAnswer}
              disabled={!inputCode.trim() || state === 'connecting'}
              data-testid="connect-answer-btn"
              className="mt-2 w-full py-2 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
            >
              {state === 'connecting' ? 'Connecting...' : 'Connect'}
            </button>
          </div>
        </div>
      )}

      {/* Joiner View */}
      {mode === 'join' && state !== 'connected' && (
        <div className="space-y-4">
          <div>
            <label htmlFor="paste-offer-input" className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              1. Paste Offer Code from peer
            </label>
            <textarea
              id="paste-offer-input"
              data-testid="paste-offer-input"
              value={inputCode}
              onChange={(e) => setInputCode(e.target.value)}
              placeholder="Paste offer code here..."
              rows={3}
              className="w-full text-xs font-mono p-2.5 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {!answerCode && (
              <button
                onClick={handleAcceptOffer}
                disabled={!inputCode.trim() || state === 'creating'}
                data-testid="generate-answer-btn"
                className="mt-2 w-full py-2 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
              >
                {state === 'creating' ? 'Generating answer...' : 'Generate Answer Code'}
              </button>
            )}
          </div>

          {answerCode && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                2. Your Answer Code (send this back to creator)
              </label>
              <div className="relative">
                <textarea
                  readOnly
                  data-testid="answer-code-output"
                  value={answerCode}
                  rows={3}
                  className="w-full text-xs font-mono p-2.5 pe-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 resize-none"
                />
                <button
                  type="button"
                  data-testid="copy-answer-btn"
                  onClick={() => copyToClipboard(answerCode, 'answer')}
                  className="absolute top-2 end-2 px-2.5 py-1 text-xs font-medium rounded-md bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                >
                  {copied === 'answer' ? 'Copied!' : 'Copy'}
                </button>
              </div>
              <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                Waiting for creator to accept answer...
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
              P2P File Transfer
            </h2>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">● Connected</span>
          </div>

          {/* Drag & Drop Area */}
          <div
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
            data-testid="drop-zone"
            className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-indigo-500 dark:hover:border-indigo-500 rounded-xl p-6 text-center transition cursor-pointer bg-slate-50/50 dark:bg-slate-800/50"
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              type="file"
              multiple
              ref={fileInputRef}
              data-testid="file-picker-input"
              className="hidden"
              onChange={(e) => handleFilesSelected(e.target.files)}
            />
            <div className="flex flex-col items-center">
              <svg className="w-8 h-8 text-indigo-500 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Drag & drop files here, or <span className="text-indigo-600 dark:text-indigo-400 underline">browse</span>
              </p>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-1">
                Any file size • Transferred directly peer-to-peer
              </p>
            </div>
          </div>

          {/* Transfer List */}
          {transfers.length > 0 && (
            <div className="space-y-3" data-testid="transfers-list">
              <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                Transfers ({transfers.length})
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto pe-1">
                {transfers.map((item) => {
                  const percent = item.size > 0 ? Math.min(100, Math.round((item.transferred / item.size) * 100)) : 0
                  return (
                    <div
                      key={item.id}
                      data-testid={`transfer-item-${item.id}`}
                      className="p-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xs space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center space-x-2 rtl:space-x-reverse min-w-0">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            item.direction === 'send'
                              ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300'
                              : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                          }`}>
                            {item.direction === 'send' ? 'SEND' : 'RECV'}
                          </span>
                          <span className="font-medium truncate max-w-[180px] sm:max-w-[220px]" title={item.name}>
                            {item.name}
                          </span>
                        </div>
                        <span className="text-slate-600 dark:text-slate-400 text-[11px]">
                          {formatBytes(item.size)}
                        </span>
                      </div>

                      {/* Progress Bar */}
                      <div className="w-full bg-slate-100 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
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

                      {/* Status / Speed / Actions */}
                      <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-400">
                        <div>
                          {item.status === 'transferring' && (
                            <span>
                              {percent}% • {formatSpeed(item.speed)} • {formatTime(item.remainingSeconds)} left
                            </span>
                          )}
                          {item.status === 'queued' && <span className="italic">Queued...</span>}
                          {item.status === 'completed' && (
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                              ✓ Completed
                            </span>
                          )}
                          {item.status === 'cancelled' && (
                            <span className="text-amber-600 dark:text-amber-400 font-medium">
                              Cancelled
                            </span>
                          )}
                          {item.status === 'failed' && (
                            <span className="text-rose-600 dark:text-rose-400 font-medium" title={item.error}>
                              ✕ Failed ({item.error || 'Error'})
                            </span>
                          )}
                        </div>

                        <div className="flex items-center space-x-2 rtl:space-x-reverse">
                          {(item.status === 'transferring' || item.status === 'queued') && (
                            <button
                              onClick={() => handleCancelTransfer(item.id)}
                              className="text-rose-600 dark:text-rose-400 hover:underline font-medium text-[11px]"
                            >
                              Cancel
                            </button>
                          )}
                          {item.direction === 'receive' && item.status === 'completed' && item.blobUrl && (
                            <a
                              href={item.blobUrl}
                              download={item.name}
                              data-testid="download-file-btn"
                              className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded text-[11px] font-medium shadow-xs"
                            >
                              Download
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
