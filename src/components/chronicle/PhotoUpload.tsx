import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui'
import { uploadEntryPhoto } from '@/data/entries'
import { fadeIn } from '@/lib/animations'
import { extractLocationFromPhoto, extractExifDate, haversineMetres, getDevicePosition } from '@/lib/geo'
import type { LocationFill } from '@/lib/geo'
import { fetchLocations } from '@/data/locations'
import { isVideoFile, extractKeyframes } from '@/lib/videoKeyframes'

/** Check if a canvas has any non-transparent pixels (detects blank HEVC renders) */
function isCanvasBlank(canvas: HTMLCanvasElement): boolean {
  const ctx = canvas.getContext('2d')!
  const data = ctx.getImageData(0, 0, Math.min(canvas.width, 50), Math.min(canvas.height, 50)).data
  // Check if all pixels are transparent/black (HEVC blank render)
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 10 && (data[i] > 5 || data[i + 1] > 5 || data[i + 2] > 5)) return false
  }
  return true
}

/** Fallback: grab a single frame from time 0 when keyframe extraction fails (HEVC etc.) */
async function grabPosterFrame(file: File): Promise<Blob | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file)
    const video = document.createElement('video')
    video.muted = true
    video.playsInline = true
    video.preload = 'auto'
    video.setAttribute('playsinline', '')

    const timeout = setTimeout(() => { URL.revokeObjectURL(url); resolve(null) }, 10000)

    video.onloadeddata = () => {
      clearTimeout(timeout)
      try {
        const vw = video.videoWidth || 640
        const vh = video.videoHeight || 480
        const scale = Math.min(1, 1024 / vw)
        const canvas = document.createElement('canvas')
        canvas.width = Math.round(vw * scale)
        canvas.height = Math.round(vh * scale)
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)

        // Check if the canvas is blank (HEVC can't be decoded to canvas)
        if (isCanvasBlank(canvas)) {
          console.warn('Video frame is blank (unsupported codec):', file.name)
          URL.revokeObjectURL(url)
          resolve(null)
          return
        }

        canvas.toBlob(
          blob => { URL.revokeObjectURL(url); resolve(blob) },
          'image/jpeg',
          0.85,
        )
      } catch {
        URL.revokeObjectURL(url)
        resolve(null)
      }
    }

    video.onerror = () => { clearTimeout(timeout); URL.revokeObjectURL(url); resolve(null) }
    video.src = url
    video.load()
  })
}

interface PhotoUploadProps {
  entryId: string | null
  maxPhotos?: number
  onUpload?: (url: string) => void
  onGeoDetected?: (loc: LocationFill) => void
  onFilesAdded?: (files: File[]) => void
  onFileRemoved?: (file: File) => void
  className?: string
}

interface PendingPhoto {
  id: string
  file: File
  previewUrl: string
  isVideo: boolean
  progress: number
  uploading: boolean
  uploadedUrl: string | null
  error: string | null
}

const DEFAULT_MAX_PHOTOS = 10

export function PhotoUpload({ entryId, maxPhotos = DEFAULT_MAX_PHOTOS, onUpload, onGeoDetected, onFilesAdded, onFileRemoved, className }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const [picking, setPicking] = useState(false)
  const [processingLabel, setProcessingLabel] = useState<string | null>(null)
  const geoFiredRef = useRef(false)

  const openPicker = () => {
    setPicking(true)
    fileInputRef.current?.click()
  }

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      setPicking(false)
      if (!files.length) return

      const remaining = maxPhotos - photos.length
      const toAdd = files.slice(0, remaining)

      // Expand video files into keyframe image files before adding
      const expandedFiles: File[] = []
      for (const file of toAdd) {
        if (isVideoFile(file)) {
          try {
            setProcessingLabel(`Extracting frames from ${file.name}...`)
            const frames = await extractKeyframes(file, { maxFrames: 5, maxWidth: 1024 })
            if (frames.length > 0) {
              for (const { blob, timestampSeconds } of frames) {
                const ext = blob.type === 'image/webp' ? 'webp' : 'jpg'
                const frameName = `${file.name.replace(/\.[^.]+$/, '')}_${Math.round(timestampSeconds)}s.${ext}`
                expandedFiles.push(new File([blob], frameName, { type: blob.type }))
              }
            } else {
              // Try poster frame fallback
              setProcessingLabel(`Grabbing thumbnail from ${file.name}...`)
              const poster = await grabPosterFrame(file)
              if (poster) {
                const frameName = `${file.name.replace(/\.[^.]+$/, '')}_poster.jpg`
                expandedFiles.push(new File([poster], frameName, { type: poster.type }))
              } else {
                // Codec unsupported for canvas extraction (e.g. HEVC on desktop Chrome)
                // Keep the original video file — upload as-is, show <video> preview
                expandedFiles.push(file)
              }
            }
          } catch (err) {
            console.error('Video processing failed:', file.name, err)
            // Still include the original video on error
            expandedFiles.push(file)
          }
        } else {
          expandedFiles.push(file)
        }
      }
      setProcessingLabel(null)

      // Re-apply the cap after expansion
      const finalFiles = expandedFiles.slice(0, maxPhotos - photos.length)

      const newPhotos: PendingPhoto[] = finalFiles.map((file) => {
        const video = isVideoFile(file)
        return {
          id: crypto.randomUUID(),
          file,
          previewUrl: video ? '' : URL.createObjectURL(file),
          isVideo: video,
          progress: 0,
          uploading: false,
          uploadedUrl: null,
          error: null,
        }
      })

      // Reset file input so same files can be re-added after removal
      e.target.value = ''

      setPhotos((prev) => [...prev, ...newPhotos])

      // Try to extract GPS/date from the first photo (only once per session)
      if (onGeoDetected && !geoFiredRef.current && finalFiles.length > 0) {
        // Extract first photo geo + latest date from ALL photos in parallel
        const allDatePromises = finalFiles.map((f) => extractExifDate(f))
        const latestDatePromise = Promise.all(allDatePromises).then((dates) => {
          const valid = dates.filter(Boolean) as string[]
          return valid.length > 0 ? valid.sort().pop()! : null
        })

        Promise.all([extractLocationFromPhoto(finalFiles[0]), latestDatePromise]).then(async ([loc, lastPhotoDate]) => {
          if (!loc || geoFiredRef.current) return
          geoFiredRef.current = true

          if (lastPhotoDate) loc.lastPhotoDate = lastPhotoDate

          // Try to match against a saved place — GPS proximity first, name fallback second
          let finalLoc = loc
          const saved = await fetchLocations()

          // If photo has no GPS, ask the device for its current position as a fallback.
          // The user is likely still at the location when they upload the photo.
          let lat = loc.lat
          let lng = loc.lng
          if (lat == null || lng == null) {
            const device = await getDevicePosition()
            if (device) { lat = device.lat; lng = device.lng }
          }

          // 1. GPS proximity: within 500m (tolerant of phone GPS drift)
          let match = (lat != null && lng != null)
            ? saved.find(
                (p) => p.lat != null && p.lng != null &&
                  haversineMetres(lat!, lng!, p.lat!, p.lng!) <= 500,
              )
            : undefined

          // 2. Name fallback: Nominatim's POI name overlaps with a saved place name
          //    (catches places added without a map pin, or photos without GPS)
          if (!match && loc.location) {
            const needle = loc.location.toLowerCase()
            match = saved.find((p) => {
              const saved_name = p.name.toLowerCase()
              return saved_name === needle
                || needle.includes(saved_name)
                || saved_name.includes(needle)
            })
          }

          if (match) {
            finalLoc = {
              ...loc,
              location: match.name,
              matchedPlaceName: match.name,
              city: loc.city || match.city,
              country: loc.country || match.country,
              country_code: loc.country_code || match.country_code,
            }
          }

          onGeoDetected(finalLoc)
        })
      }

      // If no entryId yet, hand files to the parent for deferred upload
      if (!entryId) {
        onFilesAdded?.(finalFiles)
        return
      }

      // Upload immediately
      const currentCount = photos.length
      for (let i = 0; i < newPhotos.length; i++) {
        const photo = newPhotos[i]
        const sortOrder = currentCount + i

        setPhotos((prev) =>
          prev.map((p) => (p.id === photo.id ? { ...p, uploading: true, progress: 10 } : p)),
        )

        try {
          const url = await uploadEntryPhoto(entryId, photo.file, sortOrder)
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photo.id
                ? { ...p, uploading: false, progress: 100, uploadedUrl: url }
                : p,
            ),
          )
          onUpload?.(url)
        } catch {
          setPhotos((prev) =>
            prev.map((p) =>
              p.id === photo.id
                ? { ...p, uploading: false, error: 'Upload failed' }
                : p,
            ),
          )
        }
      }
    },
    [entryId, photos.length, onUpload, onFilesAdded],
  )

  const removePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const photo = prev.find((p) => p.id === id)
      if (photo?.previewUrl) URL.revokeObjectURL(photo.previewUrl)
      if (photo && !entryId) onFileRemoved?.(photo.file)
      return prev.filter((p) => p.id !== id)
    })
  }, [entryId, onFileRemoved])

  // Clear picking state if user cancels the native picker (regains focus without onChange)
  useEffect(() => {
    if (!picking) return
    const handleFocus = () => {
      // Small delay — onChange fires before focus on some browsers
      setTimeout(() => setPicking((v) => v ? false : v), 500)
    }
    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [picking])

  // Revoke all blob URLs on unmount
  useEffect(() => {
    return () => {
      setPhotos((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.previewUrl))
        return prev
      })
    }
  }, [])

  const canAddMore = photos.length < maxPhotos
  const hasPhotos = photos.length > 0

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <p className="text-ivory-muted text-xs uppercase tracking-widest font-body">Photos</p>
        <p className="text-ivory-dim text-xs font-body">
          {photos.length}/{maxPhotos}
        </p>
      </div>

      {/* Preview grid */}
      {hasPhotos && (
        <motion.div
          variants={fadeIn}
          initial="initial"
          animate="animate"
          className="grid grid-cols-4 gap-1.5"
        >
          <AnimatePresence>
            {photos.map((photo) => (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8 }}
                transition={{ duration: 0.2 }}
                className="relative aspect-square rounded-lg overflow-hidden bg-slate-mid"
              >
                {photo.isVideo ? (
                  <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 bg-slate-mid">
                    <svg viewBox="0 0 24 24" className="w-7 h-7 fill-none stroke-gold stroke-[1.5]">
                      <rect x="2" y="4" width="20" height="16" rx="2" />
                      <polygon points="10,9 16,12 10,15" className="fill-gold/60" />
                    </svg>
                    <span className="text-ivory-dim text-[8px] font-body truncate max-w-[90%] px-1">
                      {photo.file.name}
                    </span>
                  </div>
                ) : (
                  <img
                    src={photo.previewUrl}
                    alt="Upload preview"
                    className="w-full h-full object-cover"
                    draggable={false}
                  />
                )}

                {/* Upload progress overlay */}
                {photo.uploading && (
                  <div className="absolute inset-0 bg-obsidian/60 flex flex-col items-center justify-center gap-1">
                    <Spinner size="sm" />
                    <span className="text-ivory text-[10px] font-body">
                      {photo.progress}%
                    </span>
                  </div>
                )}

                {/* Uploaded success indicator */}
                {photo.uploadedUrl && !photo.uploading && (
                  <div className="absolute top-1 left-1 w-4 h-4 rounded-full bg-green-500/80 flex items-center justify-center">
                    <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-none stroke-white stroke-[1.5]">
                      <polyline points="1.5,5 4,7.5 8.5,2.5" />
                    </svg>
                  </div>
                )}

                {/* Error indicator */}
                {photo.error && (
                  <div className="absolute inset-0 bg-red-900/60 flex items-center justify-center">
                    <span className="text-red-300 text-[10px] font-body px-1 text-center">
                      {photo.error}
                    </span>
                  </div>
                )}

                {/* Remove button */}
                {!photo.uploading && (
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 right-1 w-5 h-5 rounded-full bg-obsidian/80 flex items-center justify-center hover:bg-obsidian transition-colors"
                    aria-label="Remove photo"
                  >
                    <svg viewBox="0 0 10 10" className="w-2.5 h-2.5 fill-none stroke-ivory stroke-[1.5]">
                      <line x1="1.5" y1="1.5" x2="8.5" y2="8.5" />
                      <line x1="8.5" y1="1.5" x2="1.5" y2="8.5" />
                    </svg>
                  </button>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Processing indicator — visible while native gallery is open */}
      {(picking || processingLabel) && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center justify-center gap-3 py-6"
        >
          <img
            src="/logo-gold.webp"
            alt=""
            className="w-12 h-12 animate-spin"
            style={{ animationDuration: '2.5s' }}
          />
          <span className="text-ivory-dim text-xs font-body tracking-wide">
            {processingLabel ?? 'Processing photos...'}
          </span>
        </motion.div>
      )}

      {/* Add photos button */}
      {canAddMore && !picking && !processingLabel && (
        <button
          type="button"
          onClick={openPicker}
          className={cn(
            'flex items-center justify-center gap-2 rounded-lg border border-dashed border-white/20 transition-all duration-200',
            'text-ivory-dim hover:text-ivory-muted hover:border-white/30 font-body text-sm',
            hasPhotos ? 'h-10' : 'h-24',
          )}
        >
          <svg viewBox="0 0 20 20" className="w-4 h-4 fill-none stroke-current stroke-[1.5]">
            <line x1="10" y1="4" x2="10" y2="16" />
            <line x1="4" y1="10" x2="16" y2="10" />
          </svg>
          {hasPhotos ? 'Add more' : 'Add photos'}
        </button>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*,video/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
        aria-label="Photo file picker"
      />
    </div>
  )
}

// Hook for managing pre-creation files and uploading them after entry is created
export function usePendingPhotos(maxPhotos = DEFAULT_MAX_PHOTOS) {
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const addFiles = useCallback((files: File[]) => {
    setPendingFiles((prev) => {
      const combined = [...prev, ...files]
      return combined.slice(0, maxPhotos)
    })
  }, [maxPhotos])

  const removeFile = useCallback((file: File) => {
    setPendingFiles((prev) => prev.filter((f) => f !== file))
  }, [])

  const clearFiles = useCallback(() => {
    setPendingFiles([])
  }, [])

  const uploadAll = useCallback(
    async (entryId: string, onProgress?: (done: number, total: number) => void): Promise<{ urls: string[]; firstError: string | null }> => {
      const total = pendingFiles.length
      let done = 0
      onProgress?.(0, total)

      const results = await Promise.allSettled(
        pendingFiles.map((file, i) =>
          uploadEntryPhoto(entryId, file, i).then(url => {
            done++
            onProgress?.(done, total)
            return url
          }),
        ),
      )
      const urls: string[] = []
      let firstError: string | null = null
      for (const result of results) {
        if (result.status === 'fulfilled') {
          urls.push(result.value)
        } else {
          done++
          onProgress?.(done, total)
          const err = result.reason as { message?: string; error?: string }
          const msg = err?.message ?? err?.error ?? String(result.reason)
          console.error('Failed to upload photo:', msg)
          if (!firstError) firstError = msg
        }
      }
      return { urls, firstError }
    },
    [pendingFiles],
  )

  return { pendingFiles, addFiles, removeFile, clearFiles, uploadAll }
}
