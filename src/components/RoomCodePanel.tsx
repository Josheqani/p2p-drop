import { useState, useEffect, useRef } from 'react'
import { PeerConnection } from '../lib/peer'
import { SignalingClient, generateRoomCode } from '../lib/signalingClient'
import { DeviceInfo, getClientDeviceInfo } from '../lib/deviceInfo'
import { useI18n } from '../lib/i18n'
import { JoinRequestModal } from './JoinRequestModal'

interface RoomCodePanelProps {
  onConnected: (peer: PeerConnection) => void
  onError: (err: string | null) => void
}

export function RoomCodePanel({ onConnected, onError }: RoomCodePanelProps) {
  const { t } = useI18n()
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none')
  const [roomCode, setRoomCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [isCopied, setIsCopied] = useState(false)
  const [waitingStatus, setWaitingStatus] = useState<string | null>(null)
  const [pendingJoiner, setPendingJoiner] = useState<DeviceInfo | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isConnecting, setIsConnecting] = useState(false)

  const peerRef = useRef<PeerConnection | null>(null)
  const signalingRef = useRef<SignalingClient | null>(null)

  useEffect(() => {
    return () => {
      signalingRef.current?.close()
      if (peerRef.current && peerRef.current.state !== 'connected') {
        peerRef.current.close()
      }
    }
  }, [])

  const handleCreateRoom = async () => {
    onError(null)
    setMode('create')
    setIsConnecting(true)

    const code = generateRoomCode()
    setRoomCode(code)
    setWaitingStatus(t('waitingForJoiner'))

    const peer = new PeerConnection()
    peerRef.current = peer

    peer.onStateChange((state) => {
      if (state === 'connected') {
        setIsConnecting(false)
        setWaitingStatus(null)
        signalingRef.current?.close()
        onConnected(peer)
      } else if (state === 'failed') {
        setIsConnecting(false)
        onError(t('connectionFailedExplanation'))
      }
    })

    const client = new SignalingClient()
    signalingRef.current = client

    client.connectAsCreator(code, {
      onRoomReady: () => {
        setIsConnecting(false)
      },
      onJoinRequest: (joinerInfo) => {
        setPendingJoiner(joinerInfo)
        setIsModalOpen(true)
      },
      onSignal: async (data) => {
        try {
          if (data.type === 'answer') {
            await peer.acceptRawAnswer(data)
          }
        } catch (err) {
          onError(err instanceof Error ? err.message : 'Signaling error')
        }
      },
      onPeerDisconnected: (msg) => {
        setWaitingStatus(msg || t('waitingForJoiner'))
      },
      onError: (err) => {
        setIsConnecting(false)
        onError(err)
      },
    })
  }

  const handleAcceptJoin = async () => {
    setIsModalOpen(false)
    if (!peerRef.current || !signalingRef.current) return

    setWaitingStatus(t('statusConnecting'))
    signalingRef.current.acceptJoinRequest()

    try {
      // Create WebRTC Offer and send through WebSocket signaling
      const offer = await peerRef.current.createRawOffer()
      signalingRef.current.sendSignal(offer)
    } catch (err) {
      onError(err instanceof Error ? err.message : 'Failed to create offer')
    }
  }

  const handleDeclineJoin = () => {
    setIsModalOpen(false)
    setPendingJoiner(null)
    signalingRef.current?.declineJoinRequest()
    setWaitingStatus(t('waitingForJoiner'))
  }

  const handleJoinRoom = async () => {
    const cleanCode = inputCode.replace(/\D/g, '').trim()
    if (cleanCode.length !== 6) return

    onError(null)
    setMode('join')
    setIsConnecting(true)
    setWaitingStatus(t('requestSentWaiting'))

    const peer = new PeerConnection()
    peerRef.current = peer

    peer.onStateChange((state) => {
      if (state === 'connected') {
        setIsConnecting(false)
        setWaitingStatus(null)
        signalingRef.current?.close()
        onConnected(peer)
      } else if (state === 'failed') {
        setIsConnecting(false)
        onError(t('connectionFailedExplanation'))
      }
    })

    const deviceInfo = await getClientDeviceInfo()
    const client = new SignalingClient()
    signalingRef.current = client

    client.connectAsJoiner(cleanCode, deviceInfo, {
      onWaitingForApproval: () => {
        setWaitingStatus(t('requestSentWaiting'))
      },
      onRequestAccepted: () => {
        setWaitingStatus(t('statusConnecting'))
      },
      onRequestDeclined: (reason) => {
        setIsConnecting(false)
        setWaitingStatus(null)
        onError(reason || t('connectionDeclined'))
        client.close()
      },
      onSignal: async (data) => {
        try {
          if (data.type === 'offer') {
            const answer = await peer.acceptRawOffer(data)
            client.sendSignal(answer)
          }
        } catch (err) {
          onError(err instanceof Error ? err.message : 'Signaling error')
        }
      },
      onPeerDisconnected: (msg) => {
        setIsConnecting(false)
        setWaitingStatus(null)
        onError(msg || 'Host disconnected')
      },
      onError: (err) => {
        setIsConnecting(false)
        setWaitingStatus(null)
        onError(err)
      },
    })
  }

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomCode)
      setIsCopied(true)
      setTimeout(() => setIsCopied(false), 2500)
    } catch {
      // fallback
    }
  }

  const handleReset = () => {
    signalingRef.current?.close()
    if (peerRef.current) {
      peerRef.current.close()
      peerRef.current = null
    }
    setMode('none')
    setRoomCode('')
    setInputCode('')
    setWaitingStatus(null)
    setPendingJoiner(null)
    setIsModalOpen(false)
    setIsConnecting(false)
    onError(null)
  }

  // Format 6-digit code for display: "123 456"
  const formattedCode =
    roomCode.length === 6 ? `${roomCode.slice(0, 3)} ${roomCode.slice(3)}` : roomCode

  return (
    <div className="space-y-4">
      {mode === 'none' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            type="button"
            onClick={handleCreateRoom}
            data-testid="create-room-btn"
            className="p-5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-semibold shadow-md transition text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
          >
            <span className="text-xl block mb-1">⚡️</span>
            {t('createConnection')}
            <span className="block text-xs font-normal text-indigo-100 mt-1">
              {t('roomCodeDesc')}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setMode('join')}
            data-testid="join-room-btn"
            className="p-5 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-750 text-slate-900 dark:text-slate-100 border border-slate-300 dark:border-slate-700 rounded-2xl font-semibold shadow-sm transition text-center focus:outline-none focus:ring-2 focus:ring-slate-400 cursor-pointer"
          >
            <span className="text-xl block mb-1">🔗</span>
            {t('joinConnection')}
            <span className="block text-xs font-normal text-slate-600 dark:text-slate-400 mt-1">
              {t('enterRoomCode')}
            </span>
          </button>
        </div>
      )}

      {/* Creator View */}
      {mode === 'create' && (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 space-y-5 text-center shadow-xs">
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              {t('roomCode')}
            </span>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {t('roomCodeDesc')}
            </p>
          </div>

          {/* Big Room Code Display */}
          <div className="flex items-center justify-center gap-3">
            <div
              data-testid="room-code-display"
              className="px-6 py-3 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border-2 border-indigo-500/40 text-3xl font-extrabold tracking-widest text-indigo-600 dark:text-indigo-400 font-mono select-all shadow-inner"
            >
              {formattedCode}
            </div>
            <button
              type="button"
              onClick={handleCopyCode}
              className="p-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs transition shadow-sm"
              title={t('copy')}
            >
              {isCopied ? t('copied') : t('copy')}
            </button>
          </div>

          {/* Status Message */}
          <div className="flex items-center justify-center gap-2 text-xs text-slate-600 dark:text-slate-400">
            <span className="inline-block h-2 w-2 rounded-full bg-amber-500 animate-ping"></span>
            <span>{waitingStatus || t('waitingForJoiner')}</span>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            {t('resetOrDisconnect')}
          </button>
        </div>
      )}

      {/* Joiner View */}
      {mode === 'join' && (
        <div className="rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 p-6 space-y-4 text-center shadow-xs">
          <div className="space-y-1">
            <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {t('enterRoomCode')}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {t('roomCodeDesc')}
            </p>
          </div>

          <div className="max-w-xs mx-auto space-y-3">
            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={7}
              placeholder={t('enterRoomCodePlaceholder')}
              value={inputCode}
              onChange={(e) => {
                const val = e.target.value.replace(/\D/g, '').slice(0, 6)
                setInputCode(val)
              }}
              data-testid="room-code-input"
              className="w-full text-center text-2xl font-mono font-bold tracking-widest p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />

            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={inputCode.length !== 6 || isConnecting}
              data-testid="request-connect-btn"
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer disabled:cursor-not-allowed"
            >
              {isConnecting ? t('connecting') : t('requestToConnect')}
            </button>
          </div>

          {waitingStatus && (
            <div className="flex items-center justify-center gap-2 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>
              <span>{waitingStatus}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition"
          >
            {t('resetOrDisconnect')}
          </button>
        </div>
      )}

      {/* Confirmation Modal on Creator's device */}
      <JoinRequestModal
        isOpen={isModalOpen}
        joinerInfo={pendingJoiner}
        onAccept={handleAcceptJoin}
        onDecline={handleDeclineJoin}
      />
    </div>
  )
}
