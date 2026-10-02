import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { generateRoomCode, getWsUrl, SignalingClient } from './signalingClient'
import { DeviceInfo } from './deviceInfo'

const dummyDeviceInfo: DeviceInfo = {
  deviceType: 'mobile',
  deviceModel: 'iPhone 11',
  osName: 'iOS',
  osVersion: '17.4',
  browserName: 'Safari',
  browserVersion: '17.4',
  screenResolution: '414×896',
  displayName: 'iPhone 11 (iOS 17.4 • Safari 17)',
}

describe('signalingClient', () => {
  it('generates a 6-digit numeric room code', () => {
    const code = generateRoomCode()
    expect(code).toMatch(/^\d{6}$/)
  })

  it('constructs correct WebSocket URL', () => {
    const url = getWsUrl('123456', 'creator')
    expect(url).toContain('/api/ws?room=123456&role=creator')
  })
})

describe('SignalingClient WebSocket interactions', () => {
  interface MockWebSocket {
    readyState: number
    send: ReturnType<typeof vi.fn>
    close: ReturnType<typeof vi.fn>
    addEventListener: ReturnType<typeof vi.fn>
    removeEventListener: ReturnType<typeof vi.fn>
    onopen?: () => void
    onmessage?: (event: { data: string }) => void
    onerror?: () => void
    onclose?: (event: { code: number }) => void
  }

  let mockWs: MockWebSocket

  beforeEach(() => {
    mockWs = {
      readyState: 1,
      send: vi.fn(),
      close: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }
    const MockWsClass = Object.assign(vi.fn(() => mockWs), {
      OPEN: 1,
      CONNECTING: 0,
      CLOSING: 2,
      CLOSED: 3,
    })
    vi.stubGlobal('WebSocket', MockWsClass)
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('initiates creator connection and sends signals', () => {
    const client = new SignalingClient()
    const callbacks = {
      onRoomReady: vi.fn(),
      onJoinRequest: vi.fn(),
      onSignal: vi.fn(),
      onPeerDisconnected: vi.fn(),
      onError: vi.fn(),
    }

    client.connectAsCreator('654321', callbacks)
    mockWs.onopen?.()

    expect(callbacks.onRoomReady).toHaveBeenCalledWith('654321')

    client.acceptJoinRequest()
    expect(mockWs.send).toHaveBeenCalledWith(JSON.stringify({ type: 'accept_request' }))

    client.sendSignal({ type: 'offer', sdp: 'dummy' })
    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'signal', data: { type: 'offer', sdp: 'dummy' } }),
    )

    client.close()
    expect(mockWs.close).toHaveBeenCalled()
  })

  it('initiates joiner connection and handles approval message', () => {
    const client = new SignalingClient()
    const callbacks = {
      onWaitingForApproval: vi.fn(),
      onRequestAccepted: vi.fn(),
      onRequestDeclined: vi.fn(),
      onSignal: vi.fn(),
      onPeerDisconnected: vi.fn(),
      onError: vi.fn(),
    }

    client.connectAsJoiner('654321', dummyDeviceInfo, callbacks)
    mockWs.onopen?.()

    expect(mockWs.send).toHaveBeenCalledWith(
      JSON.stringify({ type: 'join_request', joinerInfo: dummyDeviceInfo }),
    )

    mockWs.onmessage?.({ data: JSON.stringify({ type: 'waiting_for_approval' }) })
    expect(callbacks.onWaitingForApproval).toHaveBeenCalled()

    mockWs.onmessage?.({ data: JSON.stringify({ type: 'request_accepted' }) })
    expect(callbacks.onRequestAccepted).toHaveBeenCalled()

    client.close()
  })
})
