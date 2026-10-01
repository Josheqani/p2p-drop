/**
 * File transfer protocol over WebRTC RTCDataChannel.
 * Features:
 * - 16 KiB chunks
 * - Backpressure handling (pause on high-water mark, resume on bufferedamountlow)
 * - Single active transfer at a time with FIFO queue
 * - Disk streaming with showSaveFilePicker when available, falling back to Blob download
 * - Bidirectional cancellation and connection-drop recovery
 */

export const CHUNK_SIZE = 16 * 1024 // 16 KiB
export const HIGH_WATER_MARK = 1024 * 1024 // 1 MiB
export const LOW_WATER_MARK = 256 * 1024 // 256 KiB

export type ControlMessage =
  | { type: 'meta'; id: string; name: string; size: number; mime: string }
  | { type: 'done'; id: string }
  | { type: 'cancel'; id: string; reason?: string }

export type TransferStatus =
  | 'queued'
  | 'transferring'
  | 'completed'
  | 'cancelled'
  | 'failed'

export interface TransferItem {
  id: string
  name: string
  size: number
  mime: string
  direction: 'send' | 'receive'
  status: TransferStatus
  transferred: number
  speed: number // bytes per second
  remainingSeconds: number
  error?: string
  blobUrl?: string
  savedToDisk?: boolean
  file?: File
}

type ChangeListener = (transfers: TransferItem[]) => void

export class TransferManager {
  private channel: RTCDataChannel | null = null
  private transfers: TransferItem[] = []
  private listeners = new Set<ChangeListener>()

  private currentSendingItem: TransferItem | null = null
  private currentReceivingItem: TransferItem | null = null
  private receivingChunks: ArrayBuffer[] = []
  private receivingWritable: FileSystemWritableFileStream | null = null

  private lastSpeedTime = 0
  private lastSpeedBytes = 0

  constructor(channel?: RTCDataChannel) {
    if (channel) {
      this.attachChannel(channel)
    }
  }

  get allTransfers(): TransferItem[] {
    return [...this.transfers]
  }

  onTransfersChange(cb: ChangeListener): () => void {
    this.listeners.add(cb)
    cb(this.allTransfers)
    return () => this.listeners.delete(cb)
  }

  private notify() {
    const list = this.allTransfers
    for (const cb of this.listeners) {
      try {
        cb(list)
      } catch (err) {
        console.error('Error in transfer listener:', err)
      }
    }
  }

  attachChannel(channel: RTCDataChannel) {
    this.channel = channel
    channel.binaryType = 'arraybuffer'
    channel.bufferedAmountLowThreshold = LOW_WATER_MARK

    const onMessage = async (evt: MessageEvent) => {
      if (typeof evt.data === 'string') {
        try {
          const msg = JSON.parse(evt.data) as ControlMessage
          await this.handleControlMessage(msg)
        } catch (err) {
          console.error('Failed to parse control message:', err)
        }
      } else if (evt.data instanceof ArrayBuffer) {
        await this.handleBinaryChunk(evt.data)
      }
    }

    const onClose = () => {
      this.handleConnectionDrop('Data channel closed')
    }

    const onError = () => {
      this.handleConnectionDrop('Data channel error')
    }

    channel.addEventListener('message', onMessage as unknown as EventListener)
    channel.addEventListener('close', onClose)
    channel.addEventListener('error', onError)
  }

  detachChannel() {
    this.handleConnectionDrop('Disconnected')
    this.channel = null
  }

  private handleConnectionDrop(reason: string) {
    let changed = false
    if (this.currentSendingItem && this.currentSendingItem.status === 'transferring') {
      this.currentSendingItem.status = 'failed'
      this.currentSendingItem.error = reason
      this.currentSendingItem = null
      changed = true
    }

    if (this.currentReceivingItem && this.currentReceivingItem.status === 'transferring') {
      this.currentReceivingItem.status = 'failed'
      this.currentReceivingItem.error = reason
      this.receivingChunks = []
      if (this.receivingWritable) {
        this.receivingWritable.abort().catch(() => {})
        this.receivingWritable = null
      }
      this.currentReceivingItem = null
      changed = true
    }

    // Cancel all remaining queued sends
    for (const item of this.transfers) {
      if (item.status === 'queued') {
        item.status = 'failed'
        item.error = reason
        changed = true
      }
    }

    if (changed) {
      this.notify()
    }
  }

  /**
   * Queue one or more files to send.
   */
  sendFiles(files: FileList | File[]) {
    const fileList = Array.from(files)
    for (const file of fileList) {
      const item: TransferItem = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        name: file.name,
        size: file.size,
        mime: file.type || 'application/octet-stream',
        direction: 'send',
        status: 'queued',
        transferred: 0,
        speed: 0,
        remainingSeconds: 0,
        file,
      }
      this.transfers.push(item)
    }
    this.notify()
    this.processSendQueue()
  }

  /**
   * Cancel an active or queued transfer.
   */
  cancelTransfer(id: string, reason = 'Cancelled by user') {
    const item = this.transfers.find((t) => t.id === id)
    if (!item) return

    if (item.status === 'queued') {
      item.status = 'cancelled'
      item.error = reason
      this.notify()
      return
    }

    if (item.status === 'transferring') {
      item.status = 'cancelled'
      item.error = reason

      // Send cancel control message over channel
      if (this.channel && this.channel.readyState === 'open') {
        try {
          this.channel.send(JSON.stringify({ type: 'cancel', id, reason }))
        } catch {
          // ignore
        }
      }

      if (item.direction === 'send') {
        this.currentSendingItem = null
        this.notify()
        this.processSendQueue()
      } else {
        this.receivingChunks = []
        if (this.receivingWritable) {
          this.receivingWritable.abort().catch(() => {})
          this.receivingWritable = null
        }
        this.currentReceivingItem = null
        this.notify()
      }
    }
  }

  private async waitForBufferDrain(channel: RTCDataChannel): Promise<void> {
    if (channel.bufferedAmount <= (channel.bufferedAmountLowThreshold || LOW_WATER_MARK)) {
      return
    }

    return new Promise((resolve) => {
      const onLow = () => {
        cleanup()
        resolve()
      }
      const onClose = () => {
        cleanup()
        resolve()
      }
      const cleanup = () => {
        channel.removeEventListener('bufferedamountlow', onLow)
        channel.removeEventListener('close', onClose)
      }
      channel.addEventListener('bufferedamountlow', onLow)
      channel.addEventListener('close', onClose)
    })
  }

  private async processSendQueue() {
    if (this.currentSendingItem) return
    if (!this.channel || this.channel.readyState !== 'open') return

    const nextItem = this.transfers.find(
      (t) => t.direction === 'send' && t.status === 'queued',
    )
    if (!nextItem || !nextItem.file) return

    this.currentSendingItem = nextItem
    nextItem.status = 'transferring'
    this.notify()

    try {
      // 1. Send meta message
      const metaMsg: ControlMessage = {
        type: 'meta',
        id: nextItem.id,
        name: nextItem.name,
        size: nextItem.size,
        mime: nextItem.mime,
      }
      this.channel.send(JSON.stringify(metaMsg))

      // 2. Stream chunks with backpressure
      let offset = 0
      this.lastSpeedTime = performance.now()
      this.lastSpeedBytes = 0

      while (offset < nextItem.size) {
        if ((nextItem.status as TransferStatus) === 'cancelled') {
          break
        }
        if (!this.channel || this.channel.readyState !== 'open') {
          nextItem.status = 'failed'
          nextItem.error = 'Connection lost during transfer'
          break
        }

        // Backpressure: pause if buffered amount exceeds high-water mark
        if (this.channel.bufferedAmount > HIGH_WATER_MARK) {
          await this.waitForBufferDrain(this.channel)
          if ((nextItem.status as TransferStatus) === 'cancelled' || !this.channel || this.channel.readyState !== 'open') {
            break
          }
        }

        const end = Math.min(offset + CHUNK_SIZE, nextItem.size)
        const slice = nextItem.file.slice(offset, end)
        const chunk = typeof slice.arrayBuffer === 'function'
          ? await slice.arrayBuffer()
          : await new Response(slice).arrayBuffer()

        this.channel.send(chunk)
        offset += chunk.byteLength
        nextItem.transferred = offset

        const now = performance.now()
        const elapsed = (now - this.lastSpeedTime) / 1000
        if (elapsed >= 0.25 || offset === nextItem.size) {
          const diff = offset - this.lastSpeedBytes
          nextItem.speed = elapsed > 0 ? diff / elapsed : 0
          nextItem.remainingSeconds = nextItem.speed > 0 ? (nextItem.size - offset) / nextItem.speed : 0
          this.lastSpeedTime = now
          this.lastSpeedBytes = offset
          this.notify()
        }
      }

      // 3. Send done message if not cancelled or failed
      if (nextItem.status === 'transferring') {
        const doneMsg: ControlMessage = { type: 'done', id: nextItem.id }
        this.channel.send(JSON.stringify(doneMsg))
        nextItem.status = 'completed'
        nextItem.speed = 0
        nextItem.remainingSeconds = 0
        this.notify()
      }
    } catch (err) {
      if (nextItem.status === 'transferring') {
        nextItem.status = 'failed'
        nextItem.error = err instanceof Error ? err.message : 'Transfer error'
        this.notify()
      }
    } finally {
      this.currentSendingItem = null
      this.processSendQueue()
    }
  }

  private async handleControlMessage(msg: ControlMessage) {
    if (msg.type === 'meta') {
      const item: TransferItem = {
        id: msg.id,
        name: msg.name,
        size: msg.size,
        mime: msg.mime,
        direction: 'receive',
        status: 'transferring',
        transferred: 0,
        speed: 0,
        remainingSeconds: 0,
      }
      this.currentReceivingItem = item
      this.receivingChunks = []
      this.receivingWritable = null
      this.lastSpeedTime = performance.now()
      this.lastSpeedBytes = 0

      // If showSaveFilePicker is available and supported in current context
      if (typeof window !== 'undefined' && 'showSaveFilePicker' in window) {
        try {
          const picker = (window as unknown as {
            showSaveFilePicker: (opts: { suggestedName: string }) => Promise<FileSystemFileHandle>
          }).showSaveFilePicker
          const handle = await picker({ suggestedName: msg.name })
          this.receivingWritable = await handle.createWritable()
        } catch {
          // Fall back gracefully to Blob if user cancels picker or activation is denied
          this.receivingWritable = null
        }
      }

      this.transfers.push(item)
      this.notify()
    } else if (msg.type === 'done') {
      if (this.currentReceivingItem && this.currentReceivingItem.id === msg.id) {
        const item = this.currentReceivingItem
        if (item.transferred !== item.size) {
          item.status = 'failed'
          item.error = `Size mismatch: expected ${item.size} bytes, got ${item.transferred} bytes`
          this.receivingChunks = []
          if (this.receivingWritable) {
            await this.receivingWritable.abort().catch(() => {})
            this.receivingWritable = null
          }
        } else {
          item.status = 'completed'
          item.speed = 0
          item.remainingSeconds = 0
          if (this.receivingWritable) {
            await this.receivingWritable.close()
            this.receivingWritable = null
            item.savedToDisk = true
          } else {
            const blob = new Blob(this.receivingChunks, { type: item.mime || 'application/octet-stream' })
            item.blobUrl = URL.createObjectURL(blob)
            this.receivingChunks = []
          }
        }
        this.currentReceivingItem = null
        this.notify()
      }
    } else if (msg.type === 'cancel') {
      if (this.currentSendingItem && this.currentSendingItem.id === msg.id) {
        this.currentSendingItem.status = 'cancelled'
        this.currentSendingItem.error = msg.reason || 'Cancelled by peer'
        this.currentSendingItem = null
        this.notify()
        this.processSendQueue()
      } else if (this.currentReceivingItem && this.currentReceivingItem.id === msg.id) {
        this.currentReceivingItem.status = 'cancelled'
        this.currentReceivingItem.error = msg.reason || 'Cancelled by peer'
        this.receivingChunks = []
        if (this.receivingWritable) {
          await this.receivingWritable.abort().catch(() => {})
          this.receivingWritable = null
        }
        this.currentReceivingItem = null
        this.notify()
      }
    }
  }

  private async handleBinaryChunk(chunk: ArrayBuffer) {
    if (!this.currentReceivingItem || this.currentReceivingItem.status !== 'transferring') {
      return
    }

    const item = this.currentReceivingItem

    if (this.receivingWritable) {
      await this.receivingWritable.write(chunk)
    } else {
      this.receivingChunks.push(chunk)
    }

    item.transferred += chunk.byteLength

    const now = performance.now()
    const elapsed = (now - this.lastSpeedTime) / 1000
    if (elapsed >= 0.25 || item.transferred === item.size) {
      const diff = item.transferred - this.lastSpeedBytes
      item.speed = elapsed > 0 ? diff / elapsed : 0
      item.remainingSeconds = item.speed > 0 ? (item.size - item.transferred) / item.speed : 0
      this.lastSpeedTime = now
      this.lastSpeedBytes = item.transferred
      this.notify()
    }
  }
}
