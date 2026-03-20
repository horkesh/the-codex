import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, RefreshCw, Camera, Download, Share2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCamera } from '@/hooks/useCamera'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { fetchAllGents } from '@/data/gents'
import { getDevicePosition, reverseGeocode } from '@/lib/geo'
import { formatDate } from '@/lib/utils'
import { FieldReportOverlay } from '@/components/momento/FieldReportOverlay'
import { MarqueeOverlay } from '@/components/momento/MarqueeOverlay'
import { exportToPng, shareImage } from '@/export/exporter'
import type { Gent } from '@/types/app'
import { Spinner } from '@/components/ui'

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

type OverlayId = 'field_report' | 'marquee'

interface OverlayConfig {
  id: OverlayId
  label: string
}

const OVERLAYS: OverlayConfig[] = [
  { id: 'field_report', label: 'Field Report' },
  { id: 'marquee', label: 'Marquee' },
]

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Momento() {
  const navigate = useNavigate()
  const { gent } = useAuthStore()
  const addToast = useUIStore((s) => s.addToast)
  const camera = useCamera()

  // State
  const [gents, setGents] = useState<Gent[]>([])
  const [city, setCity] = useState<string | null>(null)
  const [country, setCountry] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(() => timeNow())
  const [activeOverlay, setActiveOverlay] = useState<OverlayId>('field_report')
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  const compositeRef = useRef<HTMLDivElement | null>(null)

  // Fetch gents + location on mount
  useEffect(() => {
    fetchAllGents().then(setGents).catch(() => {})
    getDevicePosition().then((pos) => {
      if (pos) {
        reverseGeocode(pos.lat, pos.lng).then((addr) => {
          if (addr) {
            setCity(addr.city ?? null)
            setCountry(addr.country ?? null)
          }
        }).catch(() => {})
      }
    })
  }, [])

  // Start camera on mount
  useEffect(() => {
    camera.start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Update time every second
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(timeNow()), 1000)
    return () => clearInterval(id)
  }, [])

  // Cleanup captured URL on unmount
  useEffect(() => {
    return () => {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    }
  }, [capturedUrl])

  const handleCapture = useCallback(() => {
    const blob = camera.capture()
    if (!blob) return
    setCapturedBlob(blob)
    setCapturedUrl(URL.createObjectURL(blob))
    camera.stop()
  }, [camera])

  const handleRetake = useCallback(() => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    setCapturedBlob(null)
    setCapturedUrl(null)
    camera.start()
  }, [camera, capturedUrl])

  const handleExport = useCallback(async () => {
    if (!compositeRef.current) return
    setExporting(true)
    try {
      const blob = await exportToPng(compositeRef.current)
      await shareImage(blob, `momento-${Date.now()}.png`)
      addToast('Momento exported', 'success')
    } catch (e) {
      console.error('Export failed:', e)
      addToast('Export failed', 'error')
    } finally {
      setExporting(false)
    }
  }, [addToast])

  const handleBack = useCallback(() => {
    camera.stop()
    navigate(-1)
  }, [camera, navigate])

  const cycleOverlay = useCallback((dir: 1 | -1) => {
    const idx = OVERLAYS.findIndex((o) => o.id === activeOverlay)
    const next = (idx + dir + OVERLAYS.length) % OVERLAYS.length
    setActiveOverlay(OVERLAYS[next].id)
  }, [activeOverlay])

  const today = formatDate(new Date().toISOString().slice(0, 10))

  const overlayProps = {
    city,
    country,
    date: today,
    time: currentTime,
    gents,
  }

  // ── Render ──

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Camera / captured photo area */}
      <div className="relative flex-1 overflow-hidden">
        {/* Live camera feed */}
        {!capturedUrl && (
          <video
            ref={camera.videoRef}
            autoPlay
            playsInline
            muted
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              transform: camera.facing === 'user' ? 'scaleX(-1)' : undefined,
            }}
          />
        )}

        {/* Captured photo */}
        {capturedUrl && (
          <img
            src={capturedUrl}
            alt=""
            style={{
              position: 'absolute',
              inset: 0,
              width: '100%',
              height: '100%',
              objectFit: 'cover',
            }}
          />
        )}

        {/* Camera starting indicator */}
        {camera.starting && !capturedUrl && (
          <div className="absolute inset-0 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
        )}

        {/* Camera error */}
        {camera.error && !capturedUrl && (
          <div className="absolute inset-0 flex items-center justify-center p-8">
            <div className="text-center">
              <p className="text-ivory font-body text-sm mb-2">Camera access required</p>
              <p className="text-ivory-dim font-body text-xs">{camera.error}</p>
              <button
                onClick={() => camera.start()}
                className="mt-4 px-4 py-2 rounded-lg bg-gold/20 text-gold text-sm font-body"
              >
                Try again
              </button>
            </div>
          </div>
        )}

        {/* Template overlay — visible in both live and captured modes */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeOverlay}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ position: 'absolute', inset: 0 }}
          >
            {activeOverlay === 'field_report' && <FieldReportOverlay {...overlayProps} />}
            {activeOverlay === 'marquee' && <MarqueeOverlay {...overlayProps} />}
          </motion.div>
        </AnimatePresence>

        {/* ── Export composite (hidden, rendered at 1080x1920 for export) ── */}
        {capturedUrl && (
          <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
            <div
              ref={compositeRef}
              style={{
                width: '1080px',
                height: '1920px',
                position: 'relative',
                overflow: 'hidden',
                backgroundColor: '#000',
              }}
            >
              <img
                src={capturedUrl}
                alt=""
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              {activeOverlay === 'field_report' && <FieldReportOverlay {...overlayProps} />}
              {activeOverlay === 'marquee' && <MarqueeOverlay {...overlayProps} />}
            </div>
          </div>
        )}
      </div>

      {/* ── Controls bar ── */}
      <div
        className="shrink-0 bg-black/90 backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Template selector */}
        <div className="flex items-center justify-center gap-3 py-3 px-4">
          <button
            onClick={() => cycleOverlay(-1)}
            className="p-1.5 rounded-full text-ivory-dim active:text-gold transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-ivory font-body text-xs tracking-widest uppercase min-w-[100px] text-center">
            {OVERLAYS.find((o) => o.id === activeOverlay)?.label}
          </span>
          <button
            onClick={() => cycleOverlay(1)}
            className="p-1.5 rounded-full text-ivory-dim active:text-gold transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-between px-6 pb-3">
          {/* Back */}
          <button
            onClick={handleBack}
            className="p-3 rounded-full text-ivory/70 active:text-ivory transition-colors"
          >
            <ArrowLeft size={22} />
          </button>

          {!capturedUrl ? (
            <>
              {/* Shutter */}
              <button
                onClick={handleCapture}
                disabled={!camera.stream}
                className="w-16 h-16 rounded-full border-[3px] border-gold/80 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
              >
                <div className="w-12 h-12 rounded-full bg-ivory" />
              </button>

              {/* Flip camera */}
              <button
                onClick={camera.flip}
                className="p-3 rounded-full text-ivory/70 active:text-ivory transition-colors"
              >
                <RefreshCw size={22} />
              </button>
            </>
          ) : (
            <>
              {/* Export / Share */}
              <button
                onClick={handleExport}
                disabled={exporting}
                className="px-6 py-3 rounded-full bg-gold text-obsidian font-body text-sm font-semibold flex items-center gap-2 active:scale-95 transition-transform disabled:opacity-60"
              >
                {exporting ? (
                  <Spinner size="sm" />
                ) : (
                  <>
                    <Share2 size={16} />
                    <span>Share</span>
                  </>
                )}
              </button>

              {/* Retake */}
              <button
                onClick={handleRetake}
                className="p-3 rounded-full text-ivory/70 active:text-ivory transition-colors"
              >
                <Camera size={22} />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function timeNow(): string {
  const d = new Date()
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
