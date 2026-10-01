import { encodeDescription, decodeDescription } from './signaling'
import { getActiveIceServers } from './iceConfig'

export type PeerState =
  | 'idle'
  | 'creating'
  | 'waiting'
  | 'connecting'
  | 'connected'
  | 'failed'
  | 'closed'

export interface PeerOptions {
  iceServers?: RTCIceServer[]
  iceGatheringTimeoutMs?: number
}

type StateChangeHandler = (state: PeerState) => void
type MessageHandler = (data: string | ArrayBuffer) => void
type SimpleHandler = () => void

export class PeerConnection {
  private pc: RTCPeerConnection | null = null
  private channel: RTCDataChannel | null = null
  private _state: PeerState = 'idle'
  private iceServers: RTCIceServer[]
  private iceTimeoutMs: number

  private stateChangeListeners = new Set<StateChangeHandler>()
  private messageListeners = new Set<MessageHandler>()
  private openListeners = new Set<SimpleHandler>()
  private closeListeners = new Set<SimpleHandler>()

  constructor(options?: PeerOptions) {
    this.iceServers = options?.iceServers ?? getActiveIceServers()
    this.iceTimeoutMs = options?.iceGatheringTimeoutMs ?? 5000
  }

  get state(): PeerState {
    return this._state
  }

  get dataChannel(): RTCDataChannel | null {
    return this.channel
  }

  get rawConnection(): RTCPeerConnection | null {
    return this.pc
  }

  private setState(newState: PeerState) {
    if (this._state === newState) return
    this._state = newState
    for (const listener of this.stateChangeListeners) {
      try {
        listener(newState)
      } catch (err) {
        console.error('Error in statechange listener:', err)
      }
    }
  }

  onStateChange(cb: StateChangeHandler): () => void {
    this.stateChangeListeners.add(cb)
    return () => this.stateChangeListeners.delete(cb)
  }

  onMessage(cb: MessageHandler): () => void {
    this.messageListeners.add(cb)
    return () => this.messageListeners.delete(cb)
  }

  onOpen(cb: SimpleHandler): () => void {
    this.openListeners.add(cb)
    return () => this.openListeners.delete(cb)
  }

  onClose(cb: SimpleHandler): () => void {
    this.closeListeners.add(cb)
    return () => this.closeListeners.delete(cb)
  }

  private setupDataChannel(channel: RTCDataChannel) {
    this.channel = channel
    channel.binaryType = 'arraybuffer'

    channel.onopen = () => {
      this.setState('connected')
      for (const listener of this.openListeners) {
        try {
          listener()
        } catch (err) {
          console.error('Error in open listener:', err)
        }
      }
    }

    channel.onclose = () => {
      if (this._state !== 'closed') {
        this.setState('closed')
      }
      for (const listener of this.closeListeners) {
        try {
          listener()
        } catch (err) {
          console.error('Error in close listener:', err)
        }
      }
    }

    channel.onerror = (evt) => {
      console.error('DataChannel error:', evt)
      this.setState('failed')
    }

    channel.onmessage = (evt: MessageEvent) => {
      for (const listener of this.messageListeners) {
        try {
          listener(evt.data)
        } catch (err) {
          console.error('Error in message listener:', err)
        }
      }
    }
  }

  private setupPeerConnection(): RTCPeerConnection {
    const pc = new RTCPeerConnection({ iceServers: this.iceServers })
    this.pc = pc

    pc.oniceconnectionstatechange = () => {
      if (pc.iceConnectionState === 'failed') {
        this.setState('failed')
      } else if (pc.iceConnectionState === 'closed') {
        this.setState('closed')
      }
    }

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') {
        if (this.channel && this.channel.readyState === 'open') {
          this.setState('connected')
        }
      } else if (pc.connectionState === 'failed') {
        this.setState('failed')
      } else if (pc.connectionState === 'closed') {
        this.setState('closed')
      }
    }

    return pc
  }

  private waitForIceGathering(pc: RTCPeerConnection): Promise<void> {
    if (pc.iceGatheringState === 'complete') {
      return Promise.resolve()
    }

    return new Promise((resolve) => {
      const check = () => {
        if (pc.iceGatheringState === 'complete') {
          cleanup()
          resolve()
        }
      }

      const cleanup = () => {
        clearTimeout(timer)
        pc.removeEventListener('icegatheringstatechange', check)
      }

      const timer = setTimeout(() => {
        cleanup()
        resolve()
      }, this.iceTimeoutMs)

      pc.addEventListener('icegatheringstatechange', check)
    })
  }

  /**
   * Initiates connection as offerer. Creates data channel, gathers ICE candidates,
   * and returns the compressed signaling code.
   */
  async createOffer(): Promise<string> {
    this.setState('creating')
    const pc = this.setupPeerConnection()

    const channel = pc.createDataChannel('files', { ordered: true })
    this.setupDataChannel(channel)

    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)

    await this.waitForIceGathering(pc)

    if (!pc.localDescription) {
      this.setState('failed')
      throw new Error('Failed to create offer: localDescription is null')
    }

    this.setState('waiting')
    return encodeDescription(pc.localDescription)
  }

  /**
   * Accepts an answer from the joiner.
   */
  async acceptAnswer(answerCode: string): Promise<void> {
    if (!this.pc) {
      throw new Error('Cannot accept answer without an active peer connection')
    }
    this.setState('connecting')
    const desc = await decodeDescription(answerCode)
    if (desc.type !== 'answer') {
      this.setState('failed')
      throw new Error(`Expected answer description, received "${desc.type}"`)
    }
    await this.pc.setRemoteDescription(desc)
  }

  /**
   * Accepts an offer from the creator, creates an answer, gathers ICE candidates,
   * and returns the answer signaling code.
   */
  async acceptOffer(offerCode: string): Promise<string> {
    this.setState('creating')
    const pc = this.setupPeerConnection()

    pc.ondatachannel = (evt: RTCDataChannelEvent) => {
      if (evt.channel.label === 'files') {
        this.setupDataChannel(evt.channel)
      }
    }

    const desc = await decodeDescription(offerCode)
    if (desc.type !== 'offer') {
      this.setState('failed')
      throw new Error(`Expected offer description, received "${desc.type}"`)
    }

    await pc.setRemoteDescription(desc)

    const answer = await pc.createAnswer()
    await pc.setLocalDescription(answer)

    await this.waitForIceGathering(pc)

    if (!pc.localDescription) {
      this.setState('failed')
      throw new Error('Failed to create answer: localDescription is null')
    }

    this.setState('connecting')
    return encodeDescription(pc.localDescription)
  }

  /**
   * Send data through the files channel.
   */
  send(data: string | ArrayBuffer | ArrayBufferView | Blob): void {
    if (!this.channel || this.channel.readyState !== 'open') {
      throw new Error('Cannot send: data channel is not open')
    }
    // RTCDataChannel.send supports string, Blob, ArrayBuffer, ArrayBufferView
    if (typeof data === 'string') {
      this.channel.send(data)
    } else if (data instanceof ArrayBuffer) {
      this.channel.send(data)
    } else if (data instanceof Blob) {
      this.channel.send(data)
    } else {
      this.channel.send(data)
    }
  }

  /**
   * Closes data channel and peer connection, freeing resources.
   */
  close(): void {
    try {
      if (this.channel) {
        this.channel.close()
        this.channel = null
      }
    } catch {
      // ignore
    }

    try {
      if (this.pc) {
        this.pc.close()
        this.pc = null
      }
    } catch {
      // ignore
    }

    this.setState('closed')
    this.stateChangeListeners.clear()
    this.messageListeners.clear()
    this.openListeners.clear()
    this.closeListeners.clear()
  }
}
