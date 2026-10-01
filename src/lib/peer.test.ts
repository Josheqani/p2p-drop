import { describe, it, expect, vi, beforeEach } from 'vitest'
import { PeerConnection } from './peer'

describe('PeerConnection', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('initializes with idle state and default options', () => {
    const peer = new PeerConnection()
    expect(peer.state).toBe('idle')
    expect(peer.dataChannel).toBeNull()
    expect(peer.rawConnection).toBeNull()
  })

  it('triggers statechange listeners and allows unregistering', () => {
    const peer = new PeerConnection()
    const states: string[] = []
    const unsub = peer.onStateChange((s) => states.push(s))

    // @ts-expect-error - testing private setState
    peer.setState('creating')
    expect(states).toEqual(['creating'])

    unsub()
    // @ts-expect-error - testing private setState
    peer.setState('waiting')
    expect(states).toEqual(['creating']) // no new event after unsub
  })

  it('throws error when sending while data channel is not open', () => {
    const peer = new PeerConnection()
    expect(() => peer.send('hello')).toThrow('Cannot send: data channel is not open')
  })

  it('throws error when accepting answer without active peer connection', async () => {
    const peer = new PeerConnection()
    await expect(peer.acceptAnswer('dummy')).rejects.toThrow(
      'Cannot accept answer without an active peer connection',
    )
  })

  it('closes properly and updates state to closed', () => {
    const peer = new PeerConnection()
    let closedTriggered = false
    peer.onClose(() => {
      closedTriggered = true
    })

    peer.close()
    expect(peer.state).toBe('closed')
    expect(peer.dataChannel).toBeNull()
    expect(peer.rawConnection).toBeNull()
    expect(closedTriggered).toBe(false) // onClose is for remote channel close
  })
})
