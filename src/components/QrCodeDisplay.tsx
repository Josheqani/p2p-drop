import { useEffect, useRef, useState } from 'react'
import QRCode from 'qrcode'
import { splitIntoQrChunks } from '../lib/qr'

interface QrCodeDisplayProps {
  data: string
  size?: number
}

export function QrCodeDisplay({ data, size = 220 }: QrCodeDisplayProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const chunks = splitIntoQrChunks(data)
  const [frameIndex, setFrameIndex] = useState(0)

  // Cycle through frames if chunked
  useEffect(() => {
    if (chunks.length <= 1) return
    const interval = setInterval(() => {
      setFrameIndex((prev) => (prev + 1) % chunks.length)
    }, 400)
    return () => clearInterval(interval)
  }, [chunks.length])

  // Render current frame to canvas
  useEffect(() => {
    if (!canvasRef.current || chunks.length === 0) return
    const currentChunk = chunks[frameIndex] || chunks[0]

    QRCode.toCanvas(canvasRef.current, currentChunk, {
      width: size,
      margin: 1,
      color: {
        dark: '#0f172a',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    }).catch((err) => {
      console.error('Failed to generate QR code canvas:', err)
    })
  }, [chunks, frameIndex, size])

  if (!data) return null

  return (
    <div className="flex flex-col items-center justify-center p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xs">
      <div className="p-2 bg-white rounded-lg shadow-2xs">
        <canvas ref={canvasRef} data-testid="qr-canvas" className="rounded" />
      </div>

      {chunks.length > 1 && (
        <div className="mt-2 flex items-center space-x-2 rtl:space-x-reverse text-xs text-slate-600 dark:text-slate-400">
          <span className="inline-block h-2 w-2 rounded-full bg-indigo-600 animate-ping" />
          <span data-testid="qr-frame-counter">
            Frame {frameIndex + 1} of {chunks.length}
          </span>
        </div>
      )}
    </div>
  )
}
