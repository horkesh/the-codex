import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, RefreshCw, Camera, Share2, ChevronLeft, ChevronRight } from 'lucide-react'
import { useCamera } from '@/hooks/useCamera'
import { useUIStore } from '@/store/ui'
import { fetchAllGents } from '@/data/gents'
import { getDevicePosition, reverseGeocode } from '@/lib/geo'
import { formatDate } from '@/lib/utils'
import { FieldReportOverlay } from '@/components/momento/FieldReportOverlay'
import { MarqueeOverlay } from '@/components/momento/MarqueeOverlay'
import { NoirOverlay } from '@/components/momento/NoirOverlay'
import { PolaroidOverlay } from '@/components/momento/PolaroidOverlay'
import { NeonOverlay } from '@/components/momento/NeonOverlay'
import { PostcardOverlay } from '@/components/momento/PostcardOverlay'
import { RedactedOverlay } from '@/components/momento/RedactedOverlay'
import { GlitchOverlay } from '@/components/momento/GlitchOverlay'
import { exportToPng, shareImage } from '@/export/exporter'
import type { Gent } from '@/types/app'
import type { OverlayProps } from '@/components/momento/types'
import { Spinner } from '@/components/ui'

// ---------------------------------------------------------------------------
// Template registry
// ---------------------------------------------------------------------------

type OverlayId = 'field_report' | 'marquee' | 'noir' | 'polaroid' | 'neon' | 'postcard' | 'redacted' | 'glitch'

interface OverlayEntry {
  label: string
  Component: React.ComponentType<OverlayProps>
}

const OVERLAY_REGISTRY: Record<OverlayId, OverlayEntry> = {
  field_report: { label: 'Field Report', Component: FieldReportOverlay },
  marquee:      { label: 'Marquee',      Component: MarqueeOverlay },
  noir:         { label: 'Noir',         Component: NoirOverlay },
  polaroid:     { label: 'Polaroid',     Component: PolaroidOverlay },
  neon:         { label: 'Neon',         Component: NeonOverlay },
  postcard:     { label: 'Postcard',     Component: PostcardOverlay },
  redacted:     { label: 'Classified',   Component: RedactedOverlay },
  glitch:       { label: 'Signal',       Component: GlitchOverlay },
}

const OVERLAY_IDS: OverlayId[] = ['field_report', 'marquee', 'noir', 'polaroid', 'neon', 'postcard', 'redacted', 'glitch']

// ---------------------------------------------------------------------------
// Filter registry
// ---------------------------------------------------------------------------

type FilterId = 'none' | 'grain' | 'mono' | 'warm' | 'cool' | 'fade'

interface FilterEntry {
  label: string
  css: string // CSS filter value
}

const FILTER_REGISTRY: Record<FilterId, FilterEntry> = {
  none:  { label: 'None',  css: '' },
  grain: { label: 'Grain', css: 'saturate(0.9) contrast(1.05)' },
  mono:  { label: 'Mono',  css: 'grayscale(1) contrast(1.2)' },
  warm:  { label: 'Warm',  css: 'sepia(0.15) saturate(1.2) brightness(1.05)' },
  cool:  { label: 'Cool',  css: 'hue-rotate(15deg) saturate(0.8) brightness(0.95)' },
  fade:  { label: 'Fade',  css: 'brightness(1.1) contrast(0.85) saturate(0.7)' },
}

const FILTER_IDS: FilterId[] = ['none', 'grain', 'mono', 'warm', 'cool', 'fade']

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function Momento() {
  const navigate = useNavigate()
  const addToast = useUIStore((s) => s.addToast)
  const camera = useCamera()

  // State
  const [gents, setGents] = useState<Gent[]>([])
  const [selectedGentIds, setSelectedGentIds] = useState<Set<string>>(new Set())
  const [city, setCity] = useState<string | null>(null)
  const [country, setCountry] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(() => timeNow())
  const [activeOverlay, setActiveOverlay] = useState<OverlayId>('field_report')
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [capturedTime, setCapturedTime] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterId>('none')

  const compositeRef = useRef<HTMLDivElement | null>(null)
  const [capturedAspect, setCapturedAspect] = useState<number>(4 / 3) // width/height — default 3:4 portrait
  const [today] = useState(() => formatDate(new Date().toISOString().slice(0, 10)))

  // Fetch gents + location on mount
  useEffect(() => {
    fetchAllGents().then((g) => {
      setGents(g)
      setSelectedGentIds(new Set(g.map((x) => x.id)))
    }).catch(() => {})
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

  // Update time every second (only while live — paused after capture)
  useEffect(() => {
    if (capturedUrl) return
    const id = setInterval(() => setCurrentTime(timeNow()), 1000)
    return () => clearInterval(id)
  }, [capturedUrl])

  // Cleanup captured URL on unmount
  useEffect(() => {
    return () => {
      if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    }
  }, [capturedUrl])

  const handleCapture = useCallback(async () => {
    // Read native video dimensions before capture to compute aspect ratio
    const video = camera.videoRef.current
    if (video && video.videoWidth && video.videoHeight) {
      setCapturedAspect(video.videoWidth / video.videoHeight)
    }
    const blob = await camera.capture()
    if (!blob) return
    setCapturedTime(timeNow())
    setCapturedUrl(URL.createObjectURL(blob))
    camera.stop()
  }, [camera])

  const handleRetake = useCallback(() => {
    if (capturedUrl) URL.revokeObjectURL(capturedUrl)
    setCapturedUrl(null)
    setCapturedTime(null)
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
    setActiveOverlay((prev) => {
      const idx = OVERLAY_IDS.indexOf(prev)
      const next = (idx + dir + OVERLAY_IDS.length) % OVERLAY_IDS.length
      return OVERLAY_IDS[next]
    })
  }, [])

  const toggleGent = useCallback((id: string) => {
    setSelectedGentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  // Live overlay shows current time; export composite uses frozen capture time
  const visibleGents = gents.filter((g) => selectedGentIds.has(g.id))
  const liveOverlayProps = { city, country, date: today, time: currentTime, gents: visibleGents }
  const exportOverlayProps = { city, country, date: today, time: capturedTime ?? currentTime, gents: visibleGents }
  const ActiveOverlay = OVERLAY_REGISTRY[activeOverlay].Component
  const filterCss = FILTER_REGISTRY[activeFilter].css
  const showGrain = activeFilter === 'grain'

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
              filter: filterCss || undefined,
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
              filter: filterCss || undefined,
            }}
          />
        )}

        {/* Film grain overlay */}
        {showGrain && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              zIndex: 5,
              pointerEvents: 'none',
              opacity: 0.14,
              mixBlendMode: 'overlay',
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
              backgroundSize: '128px 128px',
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
            <ActiveOverlay {...liveOverlayProps} />
          </motion.div>
        </AnimatePresence>

        {/* ── Export composite (hidden, rendered at native aspect ratio) ── */}
        {capturedUrl && (
          <div style={{ position: 'fixed', left: '-9999px', top: 0 }}>
            <div
              ref={compositeRef}
              style={{
                width: '1080px',
                height: `${Math.round(1080 / capturedAspect)}px`,
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
                  filter: filterCss || undefined,
                }}
              />
              {showGrain && (
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    zIndex: 5,
                    pointerEvents: 'none',
                    opacity: 0.14,
                    mixBlendMode: 'overlay',
                    backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E")`,
                    backgroundSize: '128px 128px',
                  }}
                />
              )}
              <ActiveOverlay {...exportOverlayProps} />
            </div>
          </div>
        )}
      </div>

      {/* ── Controls bar ── */}
      <div
        className="shrink-0 bg-black/90 backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Gent selector — tap to toggle who's in the shot */}
        {gents.length > 0 && (
          <div className="flex items-center justify-center gap-3 pt-3 px-4">
            {gents.map((g) => {
              const selected = selectedGentIds.has(g.id)
              return (
                <button
                  key={g.id}
                  onClick={() => toggleGent(g.id)}
                  className="flex flex-col items-center gap-1 transition-opacity"
                  style={{ opacity: selected ? 1 : 0.3 }}
                >
                  <div
                    className="rounded-full overflow-hidden"
                    style={{
                      width: '32px',
                      height: '32px',
                      border: selected ? '2px solid #c9a84c' : '2px solid transparent',
                      backgroundColor: '#1e1a28',
                    }}
                  >
                    {g.avatar_url ? (
                      <img src={g.avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gold text-xs font-body font-semibold">
                        {g.display_name?.charAt(0)}
                      </div>
                    )}
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {/* Filter strip */}
        <div className="flex items-center justify-center gap-2 pt-2 px-4 overflow-x-auto">
          {FILTER_IDS.map((fid) => (
            <button
              key={fid}
              onClick={() => setActiveFilter(fid)}
              className="shrink-0 px-3 py-1 rounded-full font-body text-[11px] tracking-wider uppercase transition-all"
              style={{
                backgroundColor: activeFilter === fid ? 'rgba(201,168,76,0.2)' : 'rgba(255,255,255,0.06)',
                color: activeFilter === fid ? '#c9a84c' : 'rgba(245,240,232,0.45)',
                border: activeFilter === fid ? '1px solid rgba(201,168,76,0.4)' : '1px solid transparent',
              }}
            >
              {FILTER_REGISTRY[fid].label}
            </button>
          ))}
        </div>

        {/* Template selector */}
        <div className="flex items-center justify-center gap-3 py-3 px-4">
          <button
            onClick={() => cycleOverlay(-1)}
            className="p-1.5 rounded-full text-ivory-dim active:text-gold transition-colors"
          >
            <ChevronLeft size={16} />
          </button>
          <span className="text-ivory font-body text-xs tracking-widest uppercase min-w-[100px] text-center">
            {OVERLAY_REGISTRY[activeOverlay].label}
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
