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

      async function scanFrame() {
        if (!active || !videoRef.current) return

        const video = videoRef.current
        if (video.readyState === video.HAVE_ENOUGH_DATA) {
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
            // jsQR fallback
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

          if (detectedCode) {
            const res = asm.feed(detectedCode)
            if (res.completed && res.fullCode) {
              cleanup()
              onScan(res.fullCode)
              onClose()
              return
            } else if (asm.progress.total > 1) {
              setScanProgress(asm.progress)
            }
          }
        }

        animFrameRef.current = requestAnimationFrame(scanFrame)
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-xs"
    >
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700">
          <h2 id={titleId} className="text-sm font-semibold text-slate-900 dark:text-slate-100">
            {t('scanQr')}
          </h2>
          <button
            onClick={onClose}
            data-testid="close-scanner-btn"
            className="text-xs px-2 py-1 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 rounded-md"
          >
            ✕ {t('close')}
          </button>
        </div>

        {/* Video Area */}
        <div className="relative aspect-square bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center space-y-3">
              <p className="text-xs text-rose-300">{cameraError}</p>
              <button
                onClick={onClose}
                className="px-3 py-1.5 bg-white text-slate-900 text-xs font-medium rounded-lg shadow-xs"
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
              {/* Aiming Reticle */}
              <div className="absolute inset-10 border-2 border-indigo-400/80 rounded-2xl pointer-events-none shadow-2xl animate-pulse" />

              {/* Multi-frame reassembly progress badge */}
              {scanProgress && scanProgress.total > 1 && (
                <div
                  data-testid="scan-progress-badge"
                  className="absolute bottom-3 inset-x-4 bg-slate-900/85 backdrop-blur-xs text-white text-[11px] p-2 rounded-lg text-center"
                >
                  <p className="font-medium mb-1">
                    Captured {scanProgress.received} of {scanProgress.total} frames ({scanProgress.percent}%)
                  </p>
                  <div className="w-full bg-slate-700 h-1.5 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-500 h-full transition-all duration-150"
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
