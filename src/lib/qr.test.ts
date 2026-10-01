import { describe, it, expect } from 'vitest'
import { splitIntoQrChunks, QrAssembler } from './qr'

describe('QR chunking and reassembly', () => {
  it('returns single chunk when data is within threshold', () => {
    const data = 'short-code'
    const chunks = splitIntoQrChunks(data, 100)
    expect(chunks).toEqual(['short-code'])
  })

  it('splits long codes into numbered chunks', () => {
    const data = 'abcdefghijklmnopqrstuvwxyz'
    const chunks = splitIntoQrChunks(data, 10)
    expect(chunks).toEqual([
      '1/3:abcdefghij',
      '2/3:klmnopqrst',
      '3/3:uvwxyz',
    ])
  })

  it('reassembles numbered chunks arriving in order', () => {
    const data = 'Hello, this is a longer string that needs to be reassembled.'
    const chunks = splitIntoQrChunks(data, 15)
    const assembler = new QrAssembler()

    let result = { completed: false, fullCode: null as string | null }
    for (const chunk of chunks) {
      result = assembler.feed(chunk)
    }

    expect(result.completed).toBe(true)
    expect(result.fullCode).toBe(data)
  })

  it('reassembles numbered chunks arriving out of order', () => {
    const data = 'abcdefghijklmnopqrstuvwxyz'
    const chunks = splitIntoQrChunks(data, 10)
    const assembler = new QrAssembler()

    // Feed in out-of-order: 2, 3, 1
    expect(assembler.feed(chunks[1]).completed).toBe(false)
    expect(assembler.feed(chunks[2]).completed).toBe(false)
    const result = assembler.feed(chunks[0])

    expect(result.completed).toBe(true)
    expect(result.fullCode).toBe(data)
  })

  it('immediately completes for unchunked standard codes', () => {
    const assembler = new QrAssembler()
    const result = assembler.feed('standard-unpartitioned-code')
    expect(result.completed).toBe(true)
    expect(result.fullCode).toBe('standard-unpartitioned-code')
  })
})
