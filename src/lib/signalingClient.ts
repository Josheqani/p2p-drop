import { DeviceInfo } from './deviceInfo'

export interface CreatorCallbacks {
  onRoomReady?: (roomCode: string) => void
  onJoinRequest: (joinerInfo: DeviceInfo) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSignal: (data: any) => void
  onPeerDisconnected: (message?: string) => void
  onError: (error: string) => void
}

export interface JoinerCallbacks {
  onWaitingForApproval: () => void
  onRequestAccepted: () => void
  onRequestDeclined: (reason?: string) => void
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSignal: (data: any) => void
  onPeerDisconnected: (message?: string) => void
  onError: (error: string) => void
}

export function generateRoomCode(): string {
  const pin = Math.floor(100000 + Math.random() * 900000)
  return pin.toString()
}

export function getWsUrl(roomCode: string, role: 'creator' | 'joiner'): string {
  if (typeof window === 'undefined') {
    return `ws://localhost:8787/api/ws?room=${roomCode}&role=${role}`
  }
  const isWorkerHost = window.location.host.includes('workers.dev')
  const host = isWorkerHost ? window.location.host : 'p2p-drop.josheqani-824.workers.dev'
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${host}/api/ws?room=${roomCode}&role=${role}`
}

export class SignalingClient {
  private ws: WebSocket | null = null
  private pingInterval: ReturnType<typeof setInterval> | null = null
  private isManuallyClosed = false
  private reconnectAttempts = 0
  private maxReconnectAttempts = 3

  connectAsCreator(roomCode: string, callbacks: CreatorCallbacks): void {
    this.isManuallyClosed = false
    this.closeWsOnly()

    const url = getWsUrl(roomCode, 'creator')
    const ws = new WebSocket(url)
    this.ws = ws

    ws.onopen = () => {
      this.reconnectAttempts = 0
      callbacks.onRoomReady?.(roomCode)
      this.startPing()
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'join_request') {
          callbacks.onJoinRequest(msg.joinerInfo)
        } else if (msg.type === 'signal') {
          callbacks.onSignal(msg.data)
        } else if (msg.type === 'peer_disconnected') {
          callbacks.onPeerDisconnected(msg.message)
        } else if (msg.type === 'error') {
          callbacks.onError(msg.message || 'Room error')
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }

    ws.onerror = () => {
      // Handled in onclose
    }

    ws.onclose = (event) => {
      this.stopPing()
      if (this.isManuallyClosed) return

      // Attempt silent auto-reconnect if dropped unexpectedly
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        setTimeout(() => {
          if (!this.isManuallyClosed) {
            this.connectAsCreator(roomCode, callbacks)
          }
        }, 1000)
        return
      }

      if (event.code !== 1000) {
        callbacks.onError(`Connection lost with signaling server (code: ${event.code})`)
      }
    }
  }

  connectAsJoiner(
    roomCode: string,
    joinerInfo: DeviceInfo,
    callbacks: JoinerCallbacks,
  ): void {
    this.isManuallyClosed = false
    this.closeWsOnly()

    const url = getWsUrl(roomCode, 'joiner')
    const ws = new WebSocket(url)
    this.ws = ws

    ws.onopen = () => {
      this.reconnectAttempts = 0
      this.startPing()
      this.send({
        type: 'join_request',
        joinerInfo,
      })
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)
        if (msg.type === 'waiting_for_approval') {
          callbacks.onWaitingForApproval()
        } else if (msg.type === 'request_accepted') {
          callbacks.onRequestAccepted()
        } else if (msg.type === 'request_declined') {
          callbacks.onRequestDeclined(msg.message)
        } else if (msg.type === 'signal') {
          callbacks.onSignal(msg.data)
        } else if (msg.type === 'peer_disconnected') {
          callbacks.onPeerDisconnected(msg.message)
        } else if (msg.type === 'error') {
          callbacks.onError(msg.message || 'Room error')
        }
      } catch (err) {
        console.error('Failed to parse WebSocket message:', err)
      }
    }

    ws.onerror = () => {
      // Handled in onclose
    }

    ws.onclose = (event) => {
      this.stopPing()
      if (this.isManuallyClosed) return

      // Attempt silent auto-reconnect if dropped unexpectedly
      if (this.reconnectAttempts < this.maxReconnectAttempts) {
        this.reconnectAttempts++
        setTimeout(() => {
          if (!this.isManuallyClosed) {
            this.connectAsJoiner(roomCode, joinerInfo, callbacks)
          }
        }, 1000)
        return
      }

      if (event.code !== 1000) {
        callbacks.onError(`Connection lost with signaling server (code: ${event.code})`)
      }
    }
  }

  acceptJoinRequest(): void {
    this.send({ type: 'accept_request' })
  }

  declineJoinRequest(): void {
    this.send({ type: 'decline_request' })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  sendSignal(data: any): void {
    this.send({ type: 'signal', data })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private send(payload: any): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(payload))
    }
  }

  private startPing(): void {
    this.stopPing()
    // 5-second heartbeat prevents carrier NAT timeout (MCI / Irancell / CGNAT)
    this.pingInterval = setInterval(() => {
      this.send({ type: 'ping' })
    }, 5000)
  }

  private stopPing(): void {
    if (this.pingInterval) {
      clearInterval(this.pingInterval)
      this.pingInterval = null
    }
  }

  private closeWsOnly(): void {
    this.stopPing()
    if (this.ws) {
      try {
        this.ws.close(1000, 'Normal Closure')
      } catch {
        // ignore
      }
      this.ws = null
    }
  }

  close(): void {
    this.isManuallyClosed = true
    this.closeWsOnly()
  }
}
