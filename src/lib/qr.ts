/**
 * QR code chunking and reassembly utilities.
 *
 * Design rationale:
 * WebRTC SDP codes compressed with deflate-raw and base64url typically range between
 * 600 and 900 characters. A single QR code with >400 characters requires version 14+,
 * creating dense module matrices that smartphone cameras struggle to focus on quickly.
 * By partitioning codes larger than 300 characters into animated cycling frames (1/N:..., 2/N:...)
 * at ~400ms intervals, each QR code remains low-density (version 6-8) with large dots,
 * enabling near-instant, reliable scanning across all camera lenses.
 */

export const MAX_QR_CHUNK_LENGTH = 300

/**
 * Splits a signaling code into numbered frames (e.g. "1/3:xyz", "2/3:abc", "3/3:def")
 * if it exceeds the chunk length threshold.
 */
export function splitIntoQrChunks(data: string, maxChunkLength = MAX_QR_CHUNK_LENGTH): string[] {
  if (!data) return []
  if (data.length <= maxChunkLength) {
    return [data]
  }

  const chunks: string[] = []
  const total = Math.ceil(data.length / maxChunkLength)

  for (let i = 0; i < total; i++) {
    const start = i * maxChunkLength
    const end = Math.min(start + maxChunkLength, data.length)
    const part = data.slice(start, end)
    chunks.push(`${i + 1}/${total}:${part}`)
  }

  return chunks
}

/**
 * State machine for reassembling chunked QR code frames.
 */
export class QrAssembler {
  private total = 0
  private parts = new Map<number, string>()

  reset() {
    this.total = 0
    this.parts.clear()
  }

  get progress(): { received: number; total: number; percent: number } {
    if (this.total === 0) return { received: 0, total: 1, percent: 0 }
    const received = this.parts.size
    return {
      received,
      total: this.total,
      percent: Math.round((received / this.total) * 100),
    }
  }

  feed(raw: string): { completed: boolean; fullCode: string | null } {
    if (!raw) return { completed: false, fullCode: null }

    // Check if chunk follows the "index/total:content" format (without trimming content spaces)
    const match = raw.match(/^\s*(\d+)\/(\d+):([\s\S]*)$/)
    if (!match) {
      // Single unchunked QR code
      const trimmed = raw.trim()
      return { completed: !!trimmed, fullCode: trimmed || null }
    }

    const index = parseInt(match[1], 10)
    const total = parseInt(match[2], 10)
    const content = match[3]

    if (this.total !== 0 && this.total !== total) {
      // New payload started with different total, reset
      this.reset()
    }

    this.total = total
    this.parts.set(index, content)

    if (this.parts.size === this.total) {
      const sorted: string[] = []
      for (let i = 1; i <= this.total; i++) {
        const part = this.parts.get(i)
        if (!part) return { completed: false, fullCode: null }
        sorted.push(part)
      }
      const full = sorted.join('')
      this.reset()
      return { completed: true, fullCode: full }
    }

    return { completed: false, fullCode: null }
  }
}
