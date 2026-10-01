import { describe, it, expect, beforeEach } from 'vitest'
import {
  DEFAULT_ICE_SERVERS,
  getActiveIceServers,
  getStoredIceServers,
  setStoredIceServers,
  isTurnRelayEnabled,
  setTurnRelayEnabled,
  resetIceConfig,
  isTurnServer,
} from './iceConfig'

describe('iceConfig', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('contains Cloudflare STUN as primary ICE server', () => {
    expect(DEFAULT_ICE_SERVERS[0].urls).toBe('stun:stun.cloudflare.com:3478')
  })

  it('correctly identifies TURN servers', () => {
    expect(isTurnServer({ urls: 'stun:stun.cloudflare.com:3478' })).toBe(false)
    expect(isTurnServer({ urls: 'turn:openrelay.metered.ca:80' })).toBe(true)
    expect(isTurnServer({ urls: ['stun:stun.l.google.com:19302', 'turn:turn.example.com'] })).toBe(true)
  })

  it('loads default ICE servers when localStorage is empty', () => {
    const servers = getStoredIceServers()
    expect(servers).toEqual(DEFAULT_ICE_SERVERS)
  })

  it('persists and loads custom ICE servers', () => {
    const custom = [{ urls: 'stun:my-custom-stun.org:3478' }]
    setStoredIceServers(custom)
    expect(getStoredIceServers()).toEqual(custom)
  })

  it('filters out TURN servers when turn relay is disabled', () => {
    expect(isTurnRelayEnabled()).toBe(true)
    const activeWithTurn = getActiveIceServers()
    expect(activeWithTurn.some(isTurnServer)).toBe(true)

    setTurnRelayEnabled(false)
    expect(isTurnRelayEnabled()).toBe(false)
    const activeWithoutTurn = getActiveIceServers()
    expect(activeWithoutTurn.some(isTurnServer)).toBe(false)
  })

  it('resets config back to defaults', () => {
    setTurnRelayEnabled(false)
    setStoredIceServers([{ urls: 'stun:temp.com' }])
    resetIceConfig()

    expect(isTurnRelayEnabled()).toBe(true)
    expect(getStoredIceServers()).toEqual(DEFAULT_ICE_SERVERS)
  })
})
