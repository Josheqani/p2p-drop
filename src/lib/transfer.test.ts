import { describe, it, expect, vi, beforeEach } from 'vitest'
import { TransferManager, CHUNK_SIZE, HIGH_WATER_MARK, LOW_WATER_MARK } from './transfer'

// Mock DataChannel implementation
class MockDataChannel extends EventTarget {
  readyState: RTCDataChannelState = 'open'
  binaryType: BinaryType = 'arraybuffer'
  bufferedAmount = 0
  bufferedAmountLowThreshold = LOW_WATER_MARK

  sentMessages: Array<string | ArrayBuffer> = []
  peerChannel: MockDataChannel | null = null

  send(data: string | ArrayBuffer) {
    if (this.readyState !== 'open') {
      throw new Error('Data channel not open')
    }
    this.sentMessages.push(data)
    if (this.peerChannel && this.peerChannel.readyState === 'open') {
      // simulate dispatch to peer
      queueMicrotask(() => {
        this.peerChannel?.dispatchEvent(new MessageEvent('message', { data }))
      })
    }
  }

  simulateLowBuffer() {
    this.bufferedAmount = this.bufferedAmountLowThreshold
    this.dispatchEvent(new Event('bufferedamountlow'))
  }

  close() {
    this.readyState = 'closed'
    this.dispatchEvent(new Event('close'))
    if (this.peerChannel) {
      this.peerChannel.readyState = 'closed'
      this.peerChannel.dispatchEvent(new Event('close'))
    }
  }
}

describe('TransferManager Protocol', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('chunks and transfers a file from sender to receiver', async () => {
    const senderChannel = new MockDataChannel()
    const receiverChannel = new MockDataChannel()
    senderChannel.peerChannel = receiverChannel
    receiverChannel.peerChannel = senderChannel

    const sender = new TransferManager(senderChannel as unknown as RTCDataChannel)
    const receiver = new TransferManager(receiverChannel as unknown as RTCDataChannel)

    // 40 KiB file -> 3 chunks (16 + 16 + 8)
    const content = new Uint8Array(40 * 1024).fill(65)
    const file = new File([content], 'test.txt', { type: 'text/plain' })

    sender.sendFiles([file])

    // Wait for transfer to complete
    await vi.waitFor(() => {
      const recv = receiver.allTransfers[0]
      expect(recv).toBeDefined()
      expect(recv?.status).toBe('completed')
    })

    const sendItem = sender.allTransfers[0]
    const recvItem = receiver.allTransfers[0]

    expect(sendItem.status).toBe('completed')
    expect(sendItem.transferred).toBe(40 * 1024)
    expect(recvItem.status).toBe('completed')
    expect(recvItem.transferred).toBe(40 * 1024)
    expect(recvItem.blobUrl).toBeDefined()

    // Verify messages sent
    const metaMsg = JSON.parse(senderChannel.sentMessages[0] as string)
    expect(metaMsg.type).toBe('meta')
    expect(metaMsg.name).toBe('test.txt')
    expect(metaMsg.size).toBe(40 * 1024)

    const doneMsg = JSON.parse(
      senderChannel.sentMessages[senderChannel.sentMessages.length - 1] as string,
    )
    expect(doneMsg.type).toBe('done')
  })

  it('fails receiver transfer on size mismatch', async () => {
    const channel = new MockDataChannel()
    const receiver = new TransferManager(channel as unknown as RTCDataChannel)

    // Send meta indicating 1000 bytes
    channel.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({
          type: 'meta',
          id: 'test-mismatch',
          name: 'file.bin',
          size: 1000,
          mime: 'application/octet-stream',
        }),
      }),
    )

    // Send only 500 bytes
    const partialData = new Uint8Array(500).buffer
    channel.dispatchEvent(new MessageEvent('message', { data: partialData }))

    // Send done
    channel.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({ type: 'done', id: 'test-mismatch' }),
      }),
    )

    await vi.waitFor(() => {
      const item = receiver.allTransfers[0]
      expect(item.status).toBe('failed')
      expect(item.error).toContain('Size mismatch')
    })
  })

  it('applies backpressure when bufferedAmount exceeds HIGH_WATER_MARK', async () => {
    const channel = new MockDataChannel()
    const sender = new TransferManager(channel as unknown as RTCDataChannel)

    // Create a 100 KiB file
    const content = new Uint8Array(100 * 1024)
    const file = new File([content], 'backpressure.bin')

    // Simulate bufferedAmount exceeding high water mark after first chunk
    let sentChunks = 0
    const originalSend = channel.send.bind(channel)
    channel.send = (data: string | ArrayBuffer) => {
      originalSend(data)
      if (data instanceof ArrayBuffer) {
        sentChunks++
        if (sentChunks === 1) {
          channel.bufferedAmount = HIGH_WATER_MARK + 1000
        }
      }
    }

    sender.sendFiles([file])

    // Wait until sender is paused by backpressure
    await new Promise((r) => setTimeout(r, 50))
    expect(sentChunks).toBe(1)
    expect(sender.allTransfers[0].status).toBe('transferring')

    // Trigger bufferedamountlow to resume
    channel.simulateLowBuffer()

    await vi.waitFor(() => {
      expect(sender.allTransfers[0].status).toBe('completed')
    })
    expect(sentChunks).toBe(Math.ceil((100 * 1024) / CHUNK_SIZE))
  })

  it('supports cancellation by sender', async () => {
    const senderChannel = new MockDataChannel()
    const receiverChannel = new MockDataChannel()
    senderChannel.peerChannel = receiverChannel
    receiverChannel.peerChannel = senderChannel

    const sender = new TransferManager(senderChannel as unknown as RTCDataChannel)
    const receiver = new TransferManager(receiverChannel as unknown as RTCDataChannel)

    // Large file so we can cancel mid-stream
    const content = new Uint8Array(500 * 1024)
    const file = new File([content], 'bigfile.bin')

    sender.sendFiles([file])

    const transferId = sender.allTransfers[0].id
    sender.cancelTransfer(transferId, 'User stopped transfer')

    expect(sender.allTransfers[0].status).toBe('cancelled')

    await vi.waitFor(() => {
      const recv = receiver.allTransfers[0]
      expect(recv?.status).toBe('cancelled')
      expect(recv?.error).toBe('User stopped transfer')
    })
  })

  it('processes multiple files in queue sequentially', async () => {
    const senderChannel = new MockDataChannel()
    const receiverChannel = new MockDataChannel()
    senderChannel.peerChannel = receiverChannel
    receiverChannel.peerChannel = senderChannel

    const sender = new TransferManager(senderChannel as unknown as RTCDataChannel)
    const receiver = new TransferManager(receiverChannel as unknown as RTCDataChannel)

    const file1 = new File([new Uint8Array(20 * 1024)], 'f1.txt')
    const file2 = new File([new Uint8Array(30 * 1024)], 'f2.txt')

    sender.sendFiles([file1, file2])

    expect(sender.allTransfers.length).toBe(2)
    expect(sender.allTransfers[0].status).toBe('transferring')
    expect(sender.allTransfers[1].status).toBe('queued')

    await vi.waitFor(() => {
      expect(sender.allTransfers[0].status).toBe('completed')
      expect(sender.allTransfers[1].status).toBe('completed')
      expect(receiver.allTransfers.length).toBe(2)
      expect(receiver.allTransfers[0].status).toBe('completed')
      expect(receiver.allTransfers[1].status).toBe('completed')
    })
  })

  it('marks active transfers as failed when channel closes', async () => {
    const channel = new MockDataChannel()
    const receiver = new TransferManager(channel as unknown as RTCDataChannel)

    channel.dispatchEvent(
      new MessageEvent('message', {
        data: JSON.stringify({
          type: 'meta',
          id: 'test-drop',
          name: 'drop.bin',
          size: 100000,
          mime: 'application/octet-stream',
        }),
      }),
    )

    expect(receiver.allTransfers[0].status).toBe('transferring')

    channel.close()

    expect(receiver.allTransfers[0].status).toBe('failed')
    expect(receiver.allTransfers[0].error).toContain('closed')
  })
})
