import { DurableObject } from 'cloudflare:workers'

export interface Env {
  ASSETS: Fetcher
  ROOMS: DurableObjectNamespace<RoomDurableObject>
}

interface SignalingMessage {
  type:
    | 'join_request'
    | 'waiting_for_approval'
    | 'accept_request'
    | 'decline_request'
    | 'request_accepted'
    | 'request_declined'
    | 'signal'
    | 'peer_disconnected'
    | 'error'
    | 'ping'
    | 'pong'
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  joinerInfo?: any
  message?: string
  role?: string
}

export class RoomDurableObject extends DurableObject {
  private creatorWs: WebSocket | null = null
  private joinerWs: WebSocket | null = null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private pendingJoinerInfo: any = null

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env)
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url)
    const role = url.searchParams.get('role')

    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 })
    }

    const pair = new WebSocketPair()
    const [clientWs, serverWs] = Object.values(pair)

    serverWs.accept()

    if (role === 'creator') {
      // If a previous creator ws was active, close it
      if (this.creatorWs) {
        try {
          this.creatorWs.close(1000, 'Replaced by new creator')
        } catch {
          // ignore
        }
      }
      this.creatorWs = serverWs
      this.setupCreatorWs(serverWs)
    } else if (role === 'joiner') {
      if (this.joinerWs) {
        try {
          this.joinerWs.close(1000, 'Replaced by new joiner')
        } catch {
          // ignore
        }
      }
      this.joinerWs = serverWs
      this.setupJoinerWs(serverWs)
    } else {
      return new Response('Invalid role parameter. Expected "creator" or "joiner".', {
        status: 400,
      })
    }

    return new Response(null, { status: 101, webSocket: clientWs })
  }

  private send(ws: WebSocket | null, msg: SignalingMessage) {
    if (ws && ws.readyState === WebSocket.OPEN) {
      try {
        ws.send(JSON.stringify(msg))
      } catch (err) {
        console.error('Failed to send WebSocket message:', err)
      }
    }
  }

  private setupCreatorWs(ws: WebSocket) {
    ws.addEventListener('message', (event) => {
      try {
        const msg: SignalingMessage = JSON.parse(event.data as string)

        if (msg.type === 'ping') {
          this.send(ws, { type: 'pong' })
          return
        }

        if (msg.type === 'accept_request') {
          this.send(this.joinerWs, { type: 'request_accepted' })
          return
        }

        if (msg.type === 'decline_request') {
          this.send(this.joinerWs, {
            type: 'request_declined',
            message: 'Connection request was declined by the host.',
          })
          this.pendingJoinerInfo = null
          return
        }

        if (msg.type === 'signal') {
          // Relay WebRTC signal (offer/candidate) from creator to joiner
          this.send(this.joinerWs, { type: 'signal', data: msg.data })
          return
        }
      } catch (err) {
        console.error('Error handling creator message:', err)
      }
    })

    ws.addEventListener('close', () => {
      if (this.creatorWs === ws) {
        this.creatorWs = null
        this.send(this.joinerWs, {
          type: 'peer_disconnected',
          role: 'creator',
          message: 'The room host has disconnected.',
        })
      }
    })

    // If joiner was already waiting and sent info, notify creator
    if (this.joinerWs && this.pendingJoinerInfo) {
      this.send(ws, {
        type: 'join_request',
        joinerInfo: this.pendingJoinerInfo,
      })
    }
  }

  private setupJoinerWs(ws: WebSocket) {
    ws.addEventListener('message', (event) => {
      try {
        const msg: SignalingMessage = JSON.parse(event.data as string)

        if (msg.type === 'ping') {
          this.send(ws, { type: 'pong' })
          return
        }

        if (msg.type === 'join_request') {
          this.pendingJoinerInfo = msg.joinerInfo

          if (!this.creatorWs || this.creatorWs.readyState !== WebSocket.OPEN) {
            this.send(ws, {
              type: 'error',
              message: 'Room host is not connected. Please verify the code.',
            })
            return
          }

          // Forward device info to creator
          this.send(this.creatorWs, {
            type: 'join_request',
            joinerInfo: msg.joinerInfo,
          })

          this.send(ws, { type: 'waiting_for_approval' })
          return
        }

        if (msg.type === 'signal') {
          // Relay WebRTC signal (answer/candidate) from joiner to creator
          this.send(this.creatorWs, { type: 'signal', data: msg.data })
          return
        }
      } catch (err) {
        console.error('Error handling joiner message:', err)
      }
    })

    ws.addEventListener('close', () => {
      if (this.joinerWs === ws) {
        this.joinerWs = null
        this.pendingJoinerInfo = null
        this.send(this.creatorWs, {
          type: 'peer_disconnected',
          role: 'joiner',
          message: 'The connecting peer disconnected.',
        })
      }
    })
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)

    // Health check
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({ status: 'ok', time: Date.now() }), {
        headers: { 'Content-Type': 'application/json' },
      })
    }

    // WebSocket room signaling
    if (url.pathname === '/api/ws') {
      const rawRoom = url.searchParams.get('room')?.trim()
      const room = rawRoom ? (rawRoom.replace(/\D/g, '') || rawRoom.toLowerCase()) : ''
      const role = url.searchParams.get('role')?.trim().toLowerCase()

      if (!room || room.length < 4 || room.length > 16) {
        return new Response('Invalid or missing room parameter (4-16 chars required).', {
          status: 400,
        })
      }

      if (role !== 'creator' && role !== 'joiner') {
        return new Response('Invalid role parameter. Expected "creator" or "joiner".', {
          status: 400,
        })
      }

      const id = env.ROOMS.idFromName(room)
      const roomObject = env.ROOMS.get(id)
      return roomObject.fetch(request)
    }

    // Default to serving frontend static assets
    if (env.ASSETS) {
      return env.ASSETS.fetch(request)
    }

    return new Response('Asset binding not configured', { status: 404 })
  },
}
