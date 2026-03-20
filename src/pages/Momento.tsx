import { useState, useEffect, useRef, useCallback } from 'react'
import { useNavigate } from 'react-router'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, RefreshCw, Camera, Share2, ChevronLeft, ChevronRight, MapPin, Image as ImageIcon, Timer, BookOpen } from 'lucide-react'
import { useCamera } from '@/hooks/useCamera'
import { useAuthStore } from '@/store/auth'
import { useUIStore } from '@/store/ui'
import { createEntry, uploadEntryPhoto, updateEntry } from '@/data/entries'
import { fetchAllGents } from '@/data/gents'
import { getDevicePosition, reverseGeocode, fetchNearestPOIGoogle } from '@/lib/geo'
import { formatDate } from '@/lib/utils'
import { FieldReportOverlay } from '@/components/momento/FieldReportOverlay'
import { MarqueeOverlay } from '@/components/momento/MarqueeOverlay'
import { NoirOverlay } from '@/components/momento/NoirOverlay'
import { PolaroidOverlay } from '@/components/momento/PolaroidOverlay'
import { NeonOverlay } from '@/components/momento/NeonOverlay'
import { PostcardOverlay } from '@/components/momento/PostcardOverlay'
import { RedactedOverlay } from '@/components/momento/RedactedOverlay'
import { GlitchOverlay } from '@/components/momento/GlitchOverlay'
import { LocationSearchModal } from '@/components/places/LocationSearchModal'
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
  const gent = useAuthStore((s) => s.gent)
  const camera = useCamera()

  // State
  const [gents, setGents] = useState<Gent[]>([])
  const [selectedGentIds, setSelectedGentIds] = useState<Set<string>>(new Set())
  const [city, setCity] = useState<string | null>(null)
  const [country, setCountry] = useState<string | null>(null)
  const [venue, setVenue] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(() => timeNow())
  const [activeOverlay, setActiveOverlay] = useState<OverlayId>('field_report')
  const [capturedUrl, setCapturedUrl] = useState<string | null>(null)
  const [capturedTime, setCapturedTime] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [activeFilter, setActiveFilter] = useState<FilterId>('none')
  const [showLocationPicker, setShowLocationPicker] = useState(false)
  const [countdown, setCountdown] = useState<number | null>(null)
  const [timerActive, setTimerActive] = useState(false)

  const compositeRef = useRef<HTMLDivElement | null>(null)
  const filterCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const galleryInputRef = useRef<HTMLInputElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)
  const [capturedAspect, setCapturedAspect] = useState<number>(4 / 3) // width/height — default 3:4 portrait
  const [filteredExportUrl, setFilteredExportUrl] = useState<string | null>(null)

  const filterCss = FILTER_REGISTRY[activeFilter].css
  const showGrain = activeFilter === 'grain'
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
        // Micro-location: nearest venue from Google Places
        fetchNearestPOIGoogle(pos.lat, pos.lng).then((name) => {
          if (name) setVenue(name)
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

  // Bake CSS filter into a canvas data URL for export (html2canvas doesn't support CSS filter)
  useEffect(() => {
    if (!capturedUrl) { setFilteredExportUrl(null); return }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      if (!filterCanvasRef.current) filterCanvasRef.current = document.createElement('canvas')
      const canvas = filterCanvasRef.current
      canvas.width = img.naturalWidth
      canvas.height = img.naturalHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.filter = filterCss || 'none'
      ctx.drawImage(img, 0, 0)
      ctx.filter = 'none'
      // Grain overlay: draw noise if active
      if (showGrain) {
        ctx.globalAlpha = 0.12
        ctx.globalCompositeOperation = 'overlay'
        // Simple noise: random grey pixels
        const noise = ctx.createImageData(canvas.width, canvas.height)
        for (let i = 0; i < noise.data.length; i += 4) {
          const v = Math.random() * 255
          noise.data[i] = v; noise.data[i + 1] = v; noise.data[i + 2] = v; noise.data[i + 3] = 255
        }
        ctx.putImageData(noise, 0, 0)
        // putImageData ignores composite, so re-draw with overlay
        // Actually putImageData replaces pixels directly, need a different approach
        // Use a temp canvas for the noise, then drawImage with overlay
        const noiseCanvas = document.createElement('canvas')
        noiseCanvas.width = canvas.width
        noiseCanvas.height = canvas.height
        const nCtx = noiseCanvas.getContext('2d')!
        nCtx.putImageData(noise, 0, 0)
        // Re-draw the filtered image first
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'
        ctx.filter = filterCss || 'none'
        ctx.drawImage(img, 0, 0)
        ctx.filter = 'none'
        // Then overlay the noise
        ctx.globalAlpha = 0.12
        ctx.globalCompositeOperation = 'overlay'
        ctx.drawImage(noiseCanvas, 0, 0)
        ctx.globalAlpha = 1
        ctx.globalCompositeOperation = 'source-over'
      }
      setFilteredExportUrl(canvas.toDataURL('image/jpeg', 0.95))
    }
    img.src = capturedUrl
  }, [capturedUrl, filterCss, showGrain])

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

  // ── Swipe to cycle templates ──
  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    if (touchStartX.current === null || touchStartY.current === null) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    touchStartX.current = null
    touchStartY.current = null
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      cycleOverlay(dx < 0 ? 1 : -1)
    }
  }, [cycleOverlay])

  // ── Gallery import ──
  const handleGalleryPick = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      setCapturedAspect(img.naturalWidth / img.naturalHeight)
      setCapturedTime(timeNow())
      setCapturedUrl(url)
      camera.stop()
    }
    img.src = url
    e.target.value = ''
  }, [camera])

  // ── Self-timer ──
  const handleTimerCapture = useCallback(() => {
    if (timerActive) return
    setTimerActive(true)
    setCountdown(3)
    let count = 3
    timerRef.current = setInterval(() => {
      count -= 1
      if (count <= 0) {
        clearInterval(timerRef.current!)
        timerRef.current = null
        setCountdown(null)
        setTimerActive(false)
        handleCapture()
      } else {
        setCountdown(count)
      }
    }, 1000)
  }, [timerActive, handleCapture])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  // ── Publish to Chronicle ──
  const handlePublish = useCallback(async () => {
    if (!compositeRef.current || !gent) return
    setPublishing(true)
    try {
      const blob = await exportToPng(compositeRef.current)
      const file = new File([blob], `momento-${Date.now()}.webp`, { type: 'image/webp' })
      const dateStr = new Date().toISOString().slice(0, 10)
      const entry = await createEntry({
        type: 'interlude',
        title: venue || city || 'Momento',
        date: dateStr,
        location: venue ?? undefined,
        city: city ?? undefined,
        country: country ?? undefined,
        created_by: gent.id,
      })
      const photoUrl = await uploadEntryPhoto(entry.id, file, 0)
      await updateEntry(entry.id, { cover_image_url: photoUrl })
      addToast('Logged to Chronicle', 'success')
      navigate(`/chronicle/${entry.id}`)
    } catch (e) {
      console.error('Publish failed:', e)
      addToast('Failed to log', 'error')
    } finally {
      setPublishing(false)
    }
  }, [gent, venue, city, country, addToast, navigate])

  // Live overlay shows current time; export composite uses frozen capture time
  const visibleGents = gents.filter((g) => selectedGentIds.has(g.id))
  const liveOverlayProps = { city, country, venue, date: today, time: currentTime, gents: visibleGents }
  const exportOverlayProps = { city, country, venue, date: today, time: capturedTime ?? currentTime, gents: visibleGents }
  const ActiveOverlay = OVERLAY_REGISTRY[activeOverlay].Component

  // Export scale: overlays are designed for ~390px phone screen width.
  // The export canvas is 1080px wide, so scale overlay elements up proportionally.
  const EXPORT_SCALE = 1080 / 390

  // ── Render ──

  return (
    <div className="fixed inset-0 bg-black z-50 flex flex-col">
      {/* Camera / captured photo area */}
      <div
        className="relative flex-1 overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Floating back button */}
        <button
          onClick={handleBack}
          className="absolute z-20 p-2 rounded-full bg-black/40 text-ivory/80 active:text-ivory transition-colors"
          style={{ top: 'max(env(safe-area-inset-top, 16px), 16px)', left: '16px' }}
        >
          <ArrowLeft size={20} />
        </button>

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

        {/* Timer countdown overlay */}
        <AnimatePresence>
          {countdown !== null && (
            <motion.div
              key={countdown}
              initial={{ scale: 2, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.5, opacity: 0 }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
              className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
            >
              <span
                className="text-ivory font-display text-[120px] font-bold"
                style={{ textShadow: '0 0 40px rgba(0,0,0,0.8)' }}
              >
                {countdown}
              </span>
            </motion.div>
          )}
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
              {/* Filter baked into image via canvas — html2canvas doesn't support CSS filter */}
              <img
                src={filteredExportUrl || capturedUrl}
                alt=""
                style={{
                  position: 'absolute',
                  inset: 0,
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
              {/* Overlay scaled up from phone-screen size to export canvas size */}
              <div style={{
                position: 'absolute',
                inset: 0,
                transformOrigin: 'top left',
                transform: `scale(${EXPORT_SCALE})`,
                width: `${100 / EXPORT_SCALE}%`,
                height: `${100 / EXPORT_SCALE}%`,
              }}>
                <ActiveOverlay {...exportOverlayProps} />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Controls bar ── */}
      <div
        className="shrink-0 bg-black/90 backdrop-blur-xl"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 16px)' }}
      >
        {/* Venue / location bar — tappable to change */}
        <button
          onClick={() => setShowLocationPicker(true)}
          className="flex items-center gap-2 mx-4 mt-2 px-3 py-1.5 rounded-full transition-colors"
          style={{
            backgroundColor: venue || city ? 'rgba(201,168,76,0.12)' : 'rgba(255,255,255,0.06)',
            border: venue || city ? '1px solid rgba(201,168,76,0.25)' : '1px solid rgba(255,255,255,0.1)',
          }}
        >
          <MapPin size={12} className={venue || city ? 'text-gold' : 'text-ivory-dim'} />
          <span className={`font-body text-[11px] truncate ${venue || city ? 'text-gold' : 'text-ivory-dim/60'}`}>
            {venue || city || 'Add location'}
          </span>
          {venue && city && (
            <span className="text-gold/40 font-body text-[10px] truncate shrink-0">
              {city}
            </span>
          )}
        </button>

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
          {!capturedUrl ? (
            <>
              {/* Gallery */}
              <button
                onClick={() => galleryInputRef.current?.click()}
                className="p-3 rounded-full text-ivory/70 active:text-ivory transition-colors"
              >
                <ImageIcon size={22} />
              </button>

              {/* Shutter */}
              <button
                onClick={handleCapture}
                disabled={!camera.stream || timerActive}
                className="w-16 h-16 rounded-full border-[3px] border-gold/80 flex items-center justify-center active:scale-95 transition-transform disabled:opacity-40"
              >
                <div className="w-12 h-12 rounded-full bg-ivory" />
              </button>

              {/* Timer + Flip */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={handleTimerCapture}
                  disabled={!camera.stream || timerActive}
                  className="p-2 rounded-full text-ivory/70 active:text-ivory transition-colors disabled:opacity-40"
                >
                  <Timer size={18} />
                </button>
                <button
                  onClick={camera.flip}
                  className="p-2 rounded-full text-ivory/70 active:text-ivory transition-colors"
                >
                  <RefreshCw size={18} />
                </button>
              </div>
            </>
          ) : (
            <>
              {/* Log to Chronicle */}
              <button
                onClick={handlePublish}
                disabled={publishing || exporting}
                className="p-3 rounded-full text-ivory/70 active:text-ivory transition-colors disabled:opacity-40"
              >
                {publishing ? <Spinner size="sm" /> : <BookOpen size={22} />}
              </button>

              {/* Export / Share */}
              <button
                onClick={handleExport}
                disabled={exporting || publishing}
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

      {/* Hidden gallery input */}
      <input
        ref={galleryInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleGalleryPick}
      />

      {/* Location picker modal */}
      {showLocationPicker && (
        <LocationSearchModal
          onSelect={(fill) => {
            if (fill.location) setVenue(fill.location)
            if (fill.city) setCity(fill.city)
            if (fill.country) setCountry(fill.country)
          }}
          onClose={() => setShowLocationPicker(false)}
        />
      )}
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
