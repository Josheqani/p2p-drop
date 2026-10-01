export const DEFAULT_ICE_SERVERS: RTCIceServer[] = [
  // Cloudflare STUN (High-speed Anycast, resilient against DPI filtering)
  { urls: 'stun:stun.cloudflare.com:3478' },
  // Google STUN fallback
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  // Alternative port 80 & 443 STUN (bypasses UDP 19302 / 3478 blocking on cellular networks)
  { urls: 'stun:openrelay.metered.ca:80' },
  { urls: 'stun:openrelay.metered.ca:443' },
  // Free public TURN relay for symmetric NAT, CGNAT (MCI/Irancell 4G), and VPN traversals
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443',
      'turn:openrelay.metered.ca:443?transport=tcp',
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject',
  },
]

const STORAGE_KEY_ICE = 'p2p_drop_ice_servers'
const STORAGE_KEY_TURN_ENABLED = 'p2p_drop_turn_enabled'

export function isTurnServer(server: RTCIceServer): boolean {
  const urls = Array.isArray(server.urls) ? server.urls : [server.urls]
  return urls.some((u) => typeof u === 'string' && (u.startsWith('turn:') || u.startsWith('turns:')))
}

export function getStoredIceServers(): RTCIceServer[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return DEFAULT_ICE_SERVERS
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY_ICE)
    if (!raw) return DEFAULT_ICE_SERVERS
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed
    }
  } catch {
    // fallback if corrupted
  }

  return DEFAULT_ICE_SERVERS
}

export function setStoredIceServers(servers: RTCIceServer[]): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  window.localStorage.setItem(STORAGE_KEY_ICE, JSON.stringify(servers))
}

export function isTurnRelayEnabled(): boolean {
  if (typeof window === 'undefined' || !window.localStorage) return true
  const raw = window.localStorage.getItem(STORAGE_KEY_TURN_ENABLED)
  if (raw === null) return true
  return raw === 'true'
}

export function setTurnRelayEnabled(enabled: boolean): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  window.localStorage.setItem(STORAGE_KEY_TURN_ENABLED, enabled ? 'true' : 'false')
}

export function resetIceConfig(): void {
  if (typeof window === 'undefined' || !window.localStorage) return
  window.localStorage.removeItem(STORAGE_KEY_ICE)
  window.localStorage.removeItem(STORAGE_KEY_TURN_ENABLED)
}

/**
 * Returns the effective ICE servers to be passed to RTCPeerConnection.
 * If TURN relay is disabled by the user, TURN servers are omitted.
 */
export function getActiveIceServers(): RTCIceServer[] {
  const servers = getStoredIceServers()
  const turnAllowed = isTurnRelayEnabled()

  if (turnAllowed) {
    return servers
  }

  // Filter out TURN servers if relay is disabled
  return servers.filter((s) => !isTurnServer(s))
}
