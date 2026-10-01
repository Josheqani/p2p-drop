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
  if (typeof HTMLCanvasElement !== 'undefined') {
    // @ts-expect-error - mock getContext in jsdom
    HTMLCanvasElement.prototype.getContext = function () {
      return {
        fillRect: () => {},
        clearRect: () => {},
        getImageData: () => ({
          data: new Uint8ClampedArray(4),
          width: 1,
          height: 1,
        }),
        putImageData: () => {},
        createImageData: (w: number = 1, h: number = 1) => ({
          data: new Uint8ClampedArray(w * h * 4),
          width: w,
          height: h,
        }),
        setTransform: () => {},
        drawImage: () => {},
        save: () => {},
        restore: () => {},
        beginPath: () => {},
        moveTo: () => {},
        lineTo: () => {},
        closePath: () => {},
        stroke: () => {},
        translate: () => {},
        scale: () => {},
        rotate: () => {},
        arc: () => {},
        fill: () => {},
      }
    }
  }
}

