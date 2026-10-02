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
        dark: '#1D1D1F',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    }).catch((err) => {
      console.error('Failed to generate QR code canvas:', err)
    })
  }, [chunks, frameIndex, size])

  if (!data) return null

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-[#F8F8FA] dark:bg-[#2C2C2E] rounded-[20px] border border-black/[0.04] dark:border-white/[0.06] shadow-xs">
      <div className="p-3 bg-white rounded-[16px] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <canvas ref={canvasRef} data-testid="qr-canvas" className="rounded-[10px]" />
      </div>

      {chunks.length > 1 && (
        <div className="mt-3 flex items-center space-x-2 text-[11px] font-medium text-[#007AFF] dark:text-[#0A84FF] bg-[#007AFF]/10 dark:bg-[#0A84FF]/20 px-3 py-1 rounded-full">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-[#007AFF] dark:bg-[#0A84FF] animate-ping" />
          <span data-testid="qr-frame-counter">
            Frame {frameIndex + 1} of {chunks.length}
          </span>
        </div>
      )}
    </div>
  )
}
