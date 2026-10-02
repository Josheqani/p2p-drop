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

  const formattedCode =
    roomCode.length === 6 ? `${roomCode.slice(0, 3)} ${roomCode.slice(3)}` : roomCode

  return (
    <div className="space-y-4">
      {mode === 'none' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Create Button (Apple Inset Action Card) */}
          <button
            type="button"
            onClick={handleCreateRoom}
            data-testid="create-room-btn"
            className="group p-5 bg-[#F8F8FA] dark:bg-[#2C2C2E] hover:bg-[#007AFF]/10 dark:hover:bg-[#0A84FF]/15 border border-black/[0.05] dark:border-white/[0.08] hover:border-[#007AFF]/40 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-150 text-start active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#007AFF]/12 dark:bg-[#0A84FF]/20 text-[#007AFF] dark:text-[#0A84FF] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
              </svg>
            </div>
            <div className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
              {t('createConnection')}
            </div>
            <p className="text-[12px] text-[#86868B] dark:text-[#98989D] mt-1 font-normal leading-relaxed">
              {t('roomCodeDesc')}
            </p>
          </button>

          {/* Join Button (Apple Inset Action Card) */}
          <button
            type="button"
            onClick={() => setMode('join')}
            data-testid="join-room-btn"
            className="group p-5 bg-[#F8F8FA] dark:bg-[#2C2C2E] hover:bg-[#007AFF]/10 dark:hover:bg-[#0A84FF]/15 border border-black/[0.05] dark:border-white/[0.08] hover:border-[#007AFF]/40 rounded-[20px] shadow-[0_1px_3px_rgba(0,0,0,0.03)] transition-all duration-150 text-start active:scale-[0.98] cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
          >
            <div className="w-10 h-10 rounded-xl bg-[#34C759]/12 dark:bg-[#30D158]/20 text-[#248A3D] dark:text-[#30D158] flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <div className="text-[15px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7] tracking-tight">
              {t('joinConnection')}
            </div>
            <p className="text-[12px] text-[#86868B] dark:text-[#98989D] mt-1 font-normal leading-relaxed">
              {t('enterRoomCode')}
            </p>
          </button>
        </div>
      )}

      {/* Creator View: Apple SMS / Passcode Display */}
      {mode === 'create' && (
        <div className="rounded-[22px] bg-[#F8F8FA] dark:bg-[#2C2C2E] border border-black/[0.05] dark:border-white/[0.08] p-6 space-y-5 text-center shadow-xs">
          <div className="space-y-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[#86868B] dark:text-[#98989D]">
              {t('roomCode')}
            </span>
            <p className="text-[12px] text-[#86868B] dark:text-[#98989D]">
              {t('roomCodeDesc')}
            </p>
          </div>

          {/* Apple Grouped Passcode Cell */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <div
              data-testid="room-code-display"
              className="px-6 py-3.5 rounded-[18px] bg-white dark:bg-[#1C1C1E] border border-black/[0.06] dark:border-white/[0.12] text-3xl sm:text-4xl font-semibold tracking-[0.25em] text-[#007AFF] dark:text-[#0A84FF] font-mono select-all shadow-[0_2px_8px_rgba(0,0,0,0.03)]"
            >
              {formattedCode}
            </div>

            <button
              type="button"
              onClick={handleCopyCode}
              className="px-4 py-3 rounded-full bg-[#007AFF] hover:bg-[#0071E3] active:scale-95 text-white font-semibold text-xs tracking-tight transition-all duration-150 shadow-xs flex items-center gap-1.5 cursor-pointer"
              title={t('copy')}
            >
              {isCopied ? (
                <>
                  <span>✓</span>
                  <span>{t('copied')}</span>
                </>
              ) : (
                <>
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                  <span>{t('copy')}</span>
                </>
              )}
            </button>
          </div>

          {/* Status Message */}
          <div className="flex items-center justify-center gap-2 text-[12px] text-[#86868B] dark:text-[#98989D]">
            <span className="inline-block h-2 w-2 rounded-full bg-[#FF9500] animate-ping" />
            <span>{waitingStatus || t('waitingForJoiner')}</span>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="text-[12px] text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors focus-visible:outline-none"
          >
            {t('resetOrDisconnect')}
          </button>
        </div>
      )}

      {/* Joiner View: Apple Passcode Input */}
      {mode === 'join' && (
        <div className="rounded-[22px] bg-[#F8F8FA] dark:bg-[#2C2C2E] border border-black/[0.05] dark:border-white/[0.08] p-6 space-y-4 text-center shadow-xs">
          <div className="space-y-1">
            <h3 className="text-[14px] font-semibold text-[#1D1D1F] dark:text-[#F5F5F7]">
              {t('enterRoomCode')}
            </h3>
            <p className="text-[12px] text-[#86868B] dark:text-[#98989D]">
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
              className="w-full text-center text-3xl font-mono font-semibold tracking-[0.3em] p-3 rounded-[16px] border border-black/[0.08] dark:border-white/[0.12] bg-white dark:bg-[#1C1C1E] text-[#1D1D1F] dark:text-[#F5F5F7] placeholder:text-[#86868B]/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF] shadow-xs"
              autoFocus
            />

            <button
              type="button"
              onClick={handleJoinRoom}
              disabled={inputCode.length !== 6 || isConnecting}
              data-testid="request-connect-btn"
              className="w-full h-11 bg-[#007AFF] hover:bg-[#0071E3] disabled:opacity-40 text-white rounded-[14px] text-[13px] font-semibold tracking-tight transition-all duration-150 shadow-sm active:scale-[0.98] cursor-pointer disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#007AFF]"
            >
              {isConnecting ? t('connecting') : t('requestToConnect')}
            </button>
          </div>

          {waitingStatus && (
            <div className="flex items-center justify-center gap-2 text-[12px] text-[#007AFF] dark:text-[#0A84FF] font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-[#007AFF] animate-ping" />
              <span>{waitingStatus}</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleReset}
            className="text-[12px] text-[#86868B] hover:text-[#1D1D1F] dark:hover:text-[#F5F5F7] transition-colors focus-visible:outline-none"
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
