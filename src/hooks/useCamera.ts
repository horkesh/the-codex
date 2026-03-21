import { useState, useRef, useCallback, useEffect } from 'react'

export interface UseCameraReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>
  stream: MediaStream | null
  facing: 'user' | 'environment'
  error: string | null
  starting: boolean
  start: () => Promise<void>
  stop: () => void
  flip: () => void
  capture: () => Promise<Blob | null>
}

/**
 * Hook to manage camera access for the Momento feature.
 * Defaults to front-facing (selfie) camera with a flip toggle.
 */
export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)
  }, [])

  const startCamera = useCallback(async (facingMode: 'user' | 'environment') => {
    setStarting(true)
    setError(null)
    // Stop any existing stream first
    streamRef.current?.getTracks().forEach((t) => t.stop())
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode },
        audio: false,
      })
      streamRef.current = s
      setStream(s)
      if (videoRef.current) {
        videoRef.current.srcObject = s
        await videoRef.current.play()
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Camera access denied'
      setError(msg)
    } finally {
      setStarting(false)
    }
  }, [])

  const flip = useCallback(() => {
    setFacing((prev) => {
      const next = prev === 'user' ? 'environment' : 'user'
      startCamera(next)
      return next
    })
  }, [startCamera])

  const start = useCallback(() => startCamera(facing), [startCamera, facing])

  const capture = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      const video = videoRef.current
      if (!video || !video.videoWidth) { resolve(null); return }

      if (!canvasRef.current) {
        canvasRef.current = document.createElement('canvas')
      }
      const canvas = canvasRef.current

      // Crop to 9:16 (Instagram Story) from the center of the video feed
      const vw = video.videoWidth
      const vh = video.videoHeight
      const targetRatio = 9 / 16
      const videoRatio = vw / vh

      let sx = 0, sy = 0, sw = vw, sh = vh
      if (videoRatio > targetRatio) {
        // Video is wider than 9:16 — crop sides
        sw = Math.round(vh * targetRatio)
        sx = Math.round((vw - sw) / 2)
      } else {
        // Video is taller than 9:16 — crop top/bottom
        sh = Math.round(vw / targetRatio)
        sy = Math.round((vh - sh) / 2)
      }

      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext('2d')
      if (!ctx) { resolve(null); return }

      // Mirror if front-facing
      if (facing === 'user') {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh)
      ctx.setTransform(1, 0, 0, 1, 0, 0)

      canvas.toBlob(
        (blob) => resolve(blob),
        'image/jpeg',
        0.92,
      )
    })
  }, [facing])

  // Cleanup on unmount — streamRef always has the latest reference
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return {
    videoRef,
    stream,
    facing,
    error,
    starting,
    start,
    stop: stopStream,
    flip,
    capture,
  }
}
