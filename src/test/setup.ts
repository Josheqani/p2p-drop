import '@testing-library/jest-dom'

if (typeof window !== 'undefined') {
  if (typeof window.CompressionStream === 'undefined' && typeof globalThis.CompressionStream !== 'undefined') {
    ;(window as unknown as { CompressionStream: typeof CompressionStream }).CompressionStream = globalThis.CompressionStream
  }
  if (typeof window.DecompressionStream === 'undefined' && typeof globalThis.DecompressionStream !== 'undefined') {
    ;(window as unknown as { DecompressionStream: typeof DecompressionStream }).DecompressionStream = globalThis.DecompressionStream
  }
}


