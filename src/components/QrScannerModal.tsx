import { useEffect, useRef, useState, useId } from 'react'
import jsQR from 'jsqr'
import { QrAssembler } from '../lib/qr'
import { useI18n } from '../lib/i18n'

interface QrScannerModalProps {
  isOpen: boolean
  onClose: () => void
  onScan: (code: string) => void
}

export function QrScannerModal({ isOpen, onClose, onScan }: QrScannerModalProps) {
  const { t } = useI18n()
  const titleId = useId()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const animFrameRef = useRef<number | null>(null)

  const [cameraError, setCameraError] = useState<string | null>(null)
  const [scanProgress, setScanProgress] = useState<{ received: number; total: number; percent: number } | null>(null)

  useEffect(() => {
    let active = true

    function cleanup() {
      active = false
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = null
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
        streamRef.current = null
      }
    }

    if (!isOpen) {
      cleanup()
      return
    }

    setCameraError(null)
    setScanProgress(null)
    const assembler = new QrAssembler()

    async function startCamera() {
      try {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
          throw new Error('Camera access not supported in this browser or context.')
        }

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
          audio: false,
        })

        if (!active) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.setAttribute('playsinline', 'true')
          await videoRef.current.play()
        }

        startScanning(assembler)
      } catch (err) {
        console.error('Camera access error:', err)
        setCameraError(t('cameraDenied'))
      }
    }

    function startScanning(asm: QrAssembler) {
      const hasBarcodeDetector = 'BarcodeDetector' in window

      let barcodeDetector: {
        detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
      } | null = null

      if (hasBarcodeDetector) {
        try {
          const DetectorClass = (window as unknown as {
            BarcodeDetector: new (opts: { formats: string[] }) => {
              detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue: string }>>
            }
          }).BarcodeDetector
          barcodeDetector = new DetectorClass({ formats: ['qr_code'] })
        } catch {
          barcodeDetector = null
        }
      }

      let isFrameProcessing = false
      let hasCompleted = false

      async function scanFrame() {
        if (!active || !videoRef.current || hasCompleted) return

        if (isFrameProcessing) {
          animFrameRef.current = requestAnimationFrame(scanFrame)
          return
        }

        const video = videoRef.current
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
          isFrameProcessing = true
          try {
            let detectedCode: string | null = null

            if (barcodeDetector) {
              try {
                const barcodes = await barcodeDetector.detect(video)
                if (barcodes.length > 0 && barcodes[0].rawValue) {
                  detectedCode = barcodes[0].rawValue
                }
              } catch {
                // Fallback to jsQR on detection error
              }
            }

            if (!detectedCode) {
              if (!canvasRef.current) {
                canvasRef.current = document.createElement('canvas')
              }
              const canvas = canvasRef.current
              const ctx = canvas.getContext('2d', { willReadFrequently: true })

              if (ctx) {
                canvas.width = video.videoWidth
                canvas.height = video.videoHeight
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                const code = jsQR(imageData.data, imageData.width, imageData.height, {
                  inversionAttempts: 'dontInvert',
                })
                if (code && code.data) {
                  detectedCode = code.data
                }
              }
            }

            if (detectedCode && !hasCompleted) {
              const res = asm.feed(detectedCode)
              if (res.completed && res.fullCode) {
                hasCompleted = true
                cleanup()
                onScan(res.fullCode)
                onClose()
                return
              } else if (asm.progress.total > 1) {
                setScanProgress(asm.progress)
              }
            }
          } finally {
            isFrameProcessing = false
          }
        }

        if (!hasCompleted) {
          animFrameRef.current = requestAnimationFrame(scanFrame)
        }
      }

      animFrameRef.current = requestAnimationFrame(scanFrame)
    }

    startCamera()

    return cleanup
  }, [isOpen, onClose, onScan, t])

  if (!isOpen) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-md animate-in fade-in duration-150"
    >
      <div className="w-full max-w-sm bg-black rounded-[24px] shadow-2xl border border-white/15 overflow-hidden animate-in zoom-in-95 duration-150 text-white">
        {/* Navigation Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/10 bg-[#1C1C1E]/80 backdrop-blur-xl">
          <h2 id={titleId} className="text-[15px] font-semibold text-white tracking-tight">
            {t('scanQr')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            data-testid="close-scanner-btn"
            className="w-7 h-7 rounded-full bg-white/15 hover:bg-white/25 active:scale-95 text-white/80 hover:text-white flex items-center justify-center transition-all text-xs focus-visible:outline-none"
            aria-label={t('close')}
          >
            ✕
          </button>
        </div>

        {/* Video Area */}
        <div className="relative aspect-square bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-[13px] text-[#FF453A] font-medium leading-relaxed">{cameraError}</p>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-white text-black text-xs font-semibold rounded-full shadow-xs active:scale-95 transition"
              >
                {t('close')}
              </button>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                data-testid="scanner-video"
                className="w-full h-full object-cover"
              />
              {/* Apple Camera Scanner Reticle */}
              <div className="absolute inset-10 border-2 border-white/80 rounded-[20px] pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.4)]" />

              {/* Multi-frame progress badge */}
              {scanProgress && scanProgress.total > 1 && (
                <div
                  data-testid="scan-progress-badge"
                  className="absolute bottom-4 inset-x-4 bg-[#1C1C1E]/85 backdrop-blur-xl text-white text-[12px] p-3 rounded-[16px] text-center border border-white/10 shadow-lg"
                >
                  <p className="font-semibold mb-1.5">
                    Captured {scanProgress.received} of {scanProgress.total} frames ({scanProgress.percent}%)
                  </p>
                  <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-[#0A84FF] h-full transition-all duration-150 rounded-full"
                      style={{ width: `${scanProgress.percent}%` }}
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}
