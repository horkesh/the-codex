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
  capture: () => Blob | null
}

/**
 * Hook to manage camera access for the Momento feature.
 * Defaults to front-facing (selfie) camera with a flip toggle.
 */
export function useCamera(): UseCameraReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [facing, setFacing] = useState<'user' | 'environment'>('user')
  const [error, setError] = useState<string | null>(null)
  const [starting, setStarting] = useState(false)

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
      setStream(null)
    }
  }, [stream])

  const startCamera = useCallback(async (facingMode: 'user' | 'environment' = facing) => {
    setStarting(true)
    setError(null)
    // Stop any existing stream first
    if (stream) {
      stream.getTracks().forEach((t) => t.stop())
    }
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode,
          width: { ideal: 1080 },
          height: { ideal: 1920 },
        },
        audio: false,
      })
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
  }, [facing, stream])

  const flip = useCallback(() => {
    const next = facing === 'user' ? 'environment' : 'user'
    setFacing(next)
    startCamera(next)
  }, [facing, startCamera])

  const capture = useCallback((): Blob | null => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return null

    if (!canvasRef.current) {
      canvasRef.current = document.createElement('canvas')
    }
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return null

    // Mirror if front-facing
    if (facing === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0)
    // Reset transform
    ctx.setTransform(1, 0, 0, 1, 0, 0)

    // Synchronous blob via toDataURL → manual conversion
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92)
    const bin = atob(dataUrl.split(',')[1])
    const arr = new Uint8Array(bin.length)
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i)
    return new Blob([arr], { type: 'image/jpeg' })
  }, [facing])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stream?.getTracks().forEach((t) => t.stop())
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return {
    videoRef,
    stream,
    facing,
    error,
    starting,
    start: () => startCamera(facing),
    stop: stopStream,
    flip,
    capture,
  }
}
