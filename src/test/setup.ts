import '@testing-library/jest-dom'

if (typeof window !== 'undefined') {
  if (typeof window.CompressionStream === 'undefined' && typeof globalThis.CompressionStream !== 'undefined') {
    ;(window as unknown as { CompressionStream: typeof CompressionStream }).CompressionStream = globalThis.CompressionStream
  }
  if (typeof window.DecompressionStream === 'undefined' && typeof globalThis.DecompressionStream !== 'undefined') {
    ;(window as unknown as { DecompressionStream: typeof DecompressionStream }).DecompressionStream = globalThis.DecompressionStream
  }
  if (typeof Blob !== 'undefined' && !Blob.prototype.arrayBuffer) {
    Blob.prototype.arrayBuffer = function () {
      return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(reader.result as ArrayBuffer)
        reader.onerror = () => reject(reader.error)
        reader.readAsArrayBuffer(this)
      })
    }
  }
  if (typeof URL.createObjectURL === 'undefined') {
    URL.createObjectURL = () => 'blob:mock-url'
    URL.revokeObjectURL = () => {}
  }
}
