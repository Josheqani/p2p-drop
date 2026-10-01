import { describe, it, expect } from 'vitest'
import { encodeDescription, decodeDescription } from './signaling'

describe('signaling', () => {
  const sampleOffer: RTCSessionDescriptionInit = {
    type: 'offer',
    sdp: 'v=0\r\no=- 42 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=sendrecv\r\n',
  }

  const sampleAnswer: RTCSessionDescriptionInit = {
    type: 'answer',
    sdp: 'v=0\r\no=- 43 2 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\na=recvonly\r\n',
  }

  it('correctly round-trips an offer', async () => {
    const code = await encodeDescription(sampleOffer)
    expect(typeof code).toBe('string')
    expect(code.length).toBeGreaterThan(0)
    // base64url characters only, no padding
    expect(code).toMatch(/^[A-Za-z0-9_-]+$/)
    expect(code).not.toContain('=')
    expect(code).not.toContain('+')
    expect(code).not.toContain('/')

    const decoded = await decodeDescription(code)
    expect(decoded).toEqual(sampleOffer)
  })

  it('correctly round-trips an answer', async () => {
    const code = await encodeDescription(sampleAnswer)
    const decoded = await decodeDescription(code)
    expect(decoded).toEqual(sampleAnswer)
  })

  it('handles whitespace around the code', async () => {
    const code = await encodeDescription(sampleOffer)
    const paddedCode = `  \n\t  ${code}  \r\n  `
    const decoded = await decodeDescription(paddedCode)
    expect(decoded).toEqual(sampleOffer)
  })

  it('handles realistic large SDP', async () => {
    const largeSdp = 'a=candidate:1 1 UDP 2130706431 192.168.1.100 50000 typ host\r\n'.repeat(50)
    const desc: RTCSessionDescriptionInit = {
      type: 'offer',
      sdp: largeSdp,
    }
    const code = await encodeDescription(desc)
    const decoded = await decodeDescription(code)
    expect(decoded).toEqual(desc)
  })

  it('rejects invalid or empty inputs to encodeDescription', async () => {
    await expect(encodeDescription(null as unknown as RTCSessionDescriptionInit)).rejects.toThrow('Invalid session description')
    await expect(encodeDescription({} as unknown as RTCSessionDescriptionInit)).rejects.toThrow('missing type or sdp')
    await expect(encodeDescription({ type: 'offer' } as RTCSessionDescriptionInit)).rejects.toThrow('missing type or sdp')
  })

  it('rejects invalid inputs to decodeDescription', async () => {
    await expect(decodeDescription(null as unknown as string)).rejects.toThrow('Signaling code must be a string')
    await expect(decodeDescription('')).rejects.toThrow('Signaling code cannot be empty')
    await expect(decodeDescription('   ')).rejects.toThrow('Signaling code cannot be empty')
    await expect(decodeDescription('invalid!chars@')).rejects.toThrow('Invalid signaling code')
    await expect(decodeDescription('notAValidCode')).rejects.toThrow()
  })

  it('rejects decoded payloads that do not have type and sdp', async () => {
    // Manually create a compressed base64url of an object without sdp
    const invalidJson = JSON.stringify({ type: 'offer' })
    const stream = new Response(new TextEncoder().encode(invalidJson)).body!.pipeThrough(
      new CompressionStream('deflate-raw'),
    )
    const buffer = await new Response(stream).arrayBuffer()
    const binary = String.fromCharCode(...new Uint8Array(buffer))
    const base64url = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    await expect(decodeDescription(base64url)).rejects.toThrow('missing or non-string sdp')
  })

  it('rejects decoded payloads with invalid SDP type', async () => {
    const invalidJson = JSON.stringify({ type: 'invalid_type', sdp: 'dummy' })
    const stream = new Response(new TextEncoder().encode(invalidJson)).body!.pipeThrough(
      new CompressionStream('deflate-raw'),
    )
    const buffer = await new Response(stream).arrayBuffer()
    const binary = String.fromCharCode(...new Uint8Array(buffer))
    const base64url = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

    await expect(decodeDescription(base64url)).rejects.toThrow('invalid or missing type')
  })
})
