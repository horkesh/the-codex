import { useRef, useState, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { Spinner } from '@/components/ui'
import { uploadEntryPhoto } from '@/data/entries'
import { fadeIn } from '@/lib/animations'
import { extractLocationFromPhoto, haversineMetres } from '@/lib/geo'
import type { LocationFill } from '@/lib/geo'
import { fetchLocations } from '@/data/locations'

interface PhotoUploadProps {
  entryId: string | null
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
  progress: number
  uploading: boolean
  uploadedUrl: string | null
  error: string | null
}

const MAX_PHOTOS = 10

export function PhotoUpload({ entryId, onUpload, onGeoDetected, onFilesAdded, onFileRemoved, className }: PhotoUploadProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [photos, setPhotos] = useState<PendingPhoto[]>([])
  const geoFiredRef = useRef(false)

  const openPicker = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? [])
      if (!files.length) return

      const remaining = MAX_PHOTOS - photos.length
      const toAdd = files.slice(0, remaining)

      const newPhotos: PendingPhoto[] = toAdd.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        progress: 0,
        uploading: false,
        uploadedUrl: null,
        error: null,
      }))

      // Reset file input so same files can be re-added after removal
      e.target.value = ''

      setPhotos((prev) => [...prev, ...newPhotos])

      // Try to extract GPS/date from the first photo (only once per session)
      if (onGeoDetected && !geoFiredRef.current && toAdd.length > 0) {
        extractLocationFromPhoto(toAdd[0]).then(async (loc) => {
          if (!loc || geoFiredRef.current) return
          geoFiredRef.current = true

          // Try to match against a saved place — GPS proximity first, name fallback second
          let finalLoc = loc
          const saved = await fetchLocations()

          // 1. GPS proximity: within 500m (tolerant of phone GPS drift)
          let match = (loc.lat != null && loc.lng != null)
            ? saved.find(
                (p) => p.lat != null && p.lng != null &&
                  haversineMetres(loc.lat!, loc.lng!, p.lat!, p.lng!) <= 500,
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
        onFilesAdded?.(toAdd)
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

  // Revoke all blob URLs on unmount
  useEffect(() => {
    return () => {
      setPhotos((prev) => {
        prev.forEach((p) => URL.revokeObjectURL(p.previewUrl))
        return prev
      })
    }
  }, [])

  const canAddMore = photos.length < MAX_PHOTOS
  const hasPhotos = photos.length > 0

  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <p className="text-ivory-muted text-xs uppercase tracking-widest font-body">Photos</p>
        <p className="text-ivory-dim text-xs font-body">
          {photos.length}/{MAX_PHOTOS}
        </p>
      </div>

      {/* Preview grid */}
      {hasPhotos && (
        <motion.div
          variants={fadeIn}
          initial="initial"
          animate="animate"
          className="grid grid-cols-3 gap-2"
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
                <img
                  src={photo.previewUrl}
                  alt="Upload preview"
                  className="w-full h-full object-cover"
                  draggable={false}
                />

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

      {/* Add photos button */}
      {canAddMore && (
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
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileChange}
        aria-label="Photo file picker"
      />
    </div>
  )
}

// Hook for managing pre-creation files and uploading them after entry is created
export function usePendingPhotos() {
  const [pendingFiles, setPendingFiles] = useState<File[]>([])

  const addFiles = useCallback((files: File[]) => {
    setPendingFiles((prev) => {
      const combined = [...prev, ...files]
      return combined.slice(0, MAX_PHOTOS)
    })
  }, [])

  const removeFile = useCallback((file: File) => {
    setPendingFiles((prev) => prev.filter((f) => f !== file))
  }, [])

  const clearFiles = useCallback(() => {
    setPendingFiles([])
  }, [])

  const uploadAll = useCallback(
    async (entryId: string): Promise<{ urls: string[]; firstError: string | null }> => {
      const results = await Promise.allSettled(
        pendingFiles.map((file, i) => uploadEntryPhoto(entryId, file, i)),
      )
      const urls: string[] = []
      let firstError: string | null = null
      for (const result of results) {
        if (result.status === 'fulfilled') {
          urls.push(result.value)
        } else {
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
