import { useState, useEffect, useRef } from 'react'
import { PeerConnection, PeerState } from '../lib/peer'

export function ConnectionPanel() {
  const [peer, setPeer] = useState<PeerConnection | null>(null)
  const [mode, setMode] = useState<'none' | 'create' | 'join'>('none')
  const [state, setState] = useState<PeerState>('idle')
  const [offerCode, setOfferCode] = useState('')
  const [answerCode, setAnswerCode] = useState('')
  const [inputCode, setInputCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)

  // Message test state
  const [messages, setMessages] = useState<Array<{ sender: 'self' | 'peer'; text: string; time: string }>>([])
  const [messageInput, setMessageInput] = useState('')

  const peerRef = useRef<PeerConnection | null>(null)

  useEffect(() => {
    return () => {
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

  const handleCreate = async () => {
    setError(null)
    setMode('create')
    const p = new PeerConnection()
    peerRef.current = p
    setPeer(p)

    p.onStateChange((s) => setState(s))
    p.onMessage((data) => {
      if (typeof data === 'string') {
        const time = new Date().toLocaleTimeString()
        setMessages((prev) => [...prev, { sender: 'peer', text: data, time }])
      }
    })

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

    p.onStateChange((s) => setState(s))
    p.onMessage((data) => {
      if (typeof data === 'string') {
        const time = new Date().toLocaleTimeString()
        setMessages((prev) => [...prev, { sender: 'peer', text: data, time }])
      }
    })

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

  const handleSendMessage = () => {
    if (!peer || !messageInput.trim() || state !== 'connected') return
    try {
      peer.send(messageInput)
      const time = new Date().toLocaleTimeString()
      setMessages((prev) => [...prev, { sender: 'self', text: messageInput, time }])
      setMessageInput('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send message')
    }
  }

  const handleReset = () => {
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
    setMessages([])
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

      {/* Connected - Debug & Message Test */}
      {state === 'connected' && (
        <div className="space-y-4 pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
              Direct P2P Data Channel Ready
            </h2>
            <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">● Live</span>
          </div>

          {/* Messages list */}
          <div
            data-testid="messages-container"
            className="h-40 overflow-y-auto p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 space-y-2 text-xs"
          >
            {messages.length === 0 ? (
              <p className="text-slate-600 dark:text-slate-400 italic text-center py-4">
                No messages yet. Send a test message below.
              </p>
            ) : (
              messages.map((m, idx) => (
                <div
                  key={idx}
                  className={`flex flex-col ${
                    m.sender === 'self' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div
                    className={`max-w-[80%] rounded-lg px-3 py-1.5 ${
                      m.sender === 'self'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-slate-100'
                    }`}
                  >
                    <p>{m.text}</p>
                  </div>
                  <span className="text-[10px] text-slate-600 dark:text-slate-400 mt-0.5">
                    {m.sender === 'self' ? 'You' : 'Peer'} • {m.time}
                  </span>
                </div>
              ))
            )}
          </div>

          {/* Message input */}
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSendMessage()
            }}
            className="flex gap-2"
          >
            <input
              type="text"
              data-testid="message-input"
              value={messageInput}
              onChange={(e) => setMessageInput(e.target.value)}
              placeholder="Type a test message..."
              className="flex-1 text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              data-testid="send-message-btn"
              disabled={!messageInput.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition"
            >
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
