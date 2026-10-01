/**
 * Signaling codes for manual WebRTC handshake.
 * Compresses session descriptions with deflate-raw and encodes into base64url.
 */

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = ''
  const len = bytes.byteLength
  const chunkSize = 0x8000
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len))
    binary += String.fromCharCode.apply(null, chunk as unknown as number[])
  }
  const base64 = btoa(binary)
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function base64UrlToBytes(base64url: string): Uint8Array {
  // Validate allowed characters for base64url
  if (!/^[A-Za-z0-9_-]+$/.test(base64url)) {
    throw new Error('Invalid base64url characters')
  }

  let base64 = base64url.replace(/-/g, '+').replace(/_/g, '/')
  const mod4 = base64.length % 4
  if (mod4 === 1) {
    throw new Error('Invalid base64url length')
  } else if (mod4 === 2) {
    base64 += '=='
  } else if (mod4 === 3) {
    base64 += '='
  }

  let binary: string
  try {
    binary = atob(base64)
  } catch {
    throw new Error('Invalid base64 encoding')
  }

  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

/**
 * Encodes an RTCSessionDescriptionInit into a compressed base64url string.
 */
export async function encodeDescription(desc: RTCSessionDescriptionInit): Promise<string> {
  if (!desc || typeof desc !== 'object') {
    throw new Error('Invalid session description: must be an object')
  }
  if (!desc.type || !desc.sdp) {
    throw new Error('Invalid session description: missing type or sdp')
  }

  const json = JSON.stringify({ type: desc.type, sdp: desc.sdp })
  const encoder = new TextEncoder()
  const stream = new Response(encoder.encode(json)).body!.pipeThrough(
    new CompressionStream('deflate-raw')
  )
  const compressedBuffer = await new Response(stream).arrayBuffer()
  return bytesToBase64Url(new Uint8Array(compressedBuffer))
}

/**
 * Decodes a compressed base64url string back into an RTCSessionDescriptionInit.
 */
export async function decodeDescription(code: string): Promise<RTCSessionDescriptionInit> {
  if (typeof code !== 'string') {
    throw new Error('Signaling code must be a string')
  }

  const trimmed = code.trim()
  if (!trimmed) {
    throw new Error('Signaling code cannot be empty')
  }

  let bytes: Uint8Array
  try {
    bytes = base64UrlToBytes(trimmed)
  } catch (err) {
    throw new Error(`Invalid signaling code: ${err instanceof Error ? err.message : 'malformed base64'}`)
  }

  let jsonStr: string
  try {
    const stream = new Response(bytes).body!.pipeThrough(
      new DecompressionStream('deflate-raw')
    )
    const decompressed = await new Response(stream).arrayBuffer()
    jsonStr = new TextDecoder().decode(decompressed)
  } catch {
    throw new Error('Failed to decompress signaling code: invalid or corrupted data')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    throw new Error('Failed to parse signaling code: invalid JSON')
  }

  if (typeof parsed !== 'object' || parsed === null) {
    throw new Error('Invalid session description: expected an object')
  }

  const { type, sdp } = parsed as { type?: unknown; sdp?: unknown }

  const validTypes: RTCSdpType[] = ['offer', 'answer', 'pranswer', 'rollback']
  if (!type || typeof type !== 'string' || !validTypes.includes(type as RTCSdpType)) {
    throw new Error(`Invalid session description: invalid or missing type "${String(type)}"`)
  }

  if (typeof sdp !== 'string') {
    throw new Error('Invalid session description: missing or non-string sdp')
  }

  return { type: type as RTCSdpType, sdp }
}
