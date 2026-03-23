/**
 * Extract keyframes from a video file using HTML Canvas.
 * Returns an array of { blob, timestamp } for each extracted frame.
 *
 * Strategy: Extract 1 frame every `intervalSeconds` (default 3s).
 * Cap at `maxFrames` (default 10) to avoid overwhelming the AI pipeline.
 */
export async function extractKeyframes(
  videoFile: File,
  options: { intervalSeconds?: number; maxFrames?: number; maxWidth?: number } = {}
): Promise<{ blob: Blob; timestampSeconds: number }[]> {
  const { intervalSeconds = 3, maxFrames = 10, maxWidth = 1024 } = options

  const url = URL.createObjectURL(videoFile)
  const video = document.createElement('video')
  video.muted = true
  video.playsInline = true
  video.preload = 'auto'
  // iOS requires a brief play() before seeking is allowed
  video.setAttribute('playsinline', '')

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      URL.revokeObjectURL(url)
      console.warn('Video metadata load timed out:', videoFile.name)
      resolve([])
    }, 15000)

    video.onloadedmetadata = async () => {
      clearTimeout(timeout)
      const duration = video.duration
      if (!duration || !isFinite(duration)) {
        URL.revokeObjectURL(url)
        resolve([])
        return
      }

      // iOS: must play briefly before seeking works
      try {
        await video.play()
        video.pause()
      } catch {
        // play() may fail silently — seeking might still work
      }

      // Calculate frame times
      const totalFrames = Math.min(
        Math.floor(duration / intervalSeconds),
        maxFrames
      )
      if (totalFrames === 0) {
        // Video shorter than interval — grab one frame from the middle
        URL.revokeObjectURL(url)
        resolve([])
        return
      }

      const times: number[] = []
      for (let i = 0; i < totalFrames; i++) {
        times.push(i * intervalSeconds + intervalSeconds / 2)
      }

      // Set up canvas
      const vw = video.videoWidth || 640
      const vh = video.videoHeight || 480
      const scale = Math.min(1, maxWidth / vw)
      const w = Math.round(vw * scale)
      const h = Math.round(vh * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!

      const frames: { blob: Blob; timestampSeconds: number }[] = []

      // Detect WebP support for toBlob
      const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp')
      const mimeType = supportsWebP ? 'image/webp' : 'image/jpeg'
      const quality = supportsWebP ? 0.75 : 0.85

      for (const time of times) {
        try {
          await seekTo(video, time)
          ctx.drawImage(video, 0, 0, w, h)

          // Check if the frame is blank (black) — codec may not have decoded
          if (isCanvasBlank(ctx, w, h)) {
            // Retry once with a longer delay
            await new Promise(r => setTimeout(r, 200))
            ctx.drawImage(video, 0, 0, w, h)
            if (isCanvasBlank(ctx, w, h)) {
              console.warn(`Blank frame at ${time}s, skipping`)
              continue
            }
          }

          const blob = await new Promise<Blob>((res, rej) => {
            canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), mimeType, quality)
          })
          frames.push({ blob, timestampSeconds: time })
        } catch (err) {
          console.warn(`Frame extraction failed at ${time}s:`, err)
        }
      }

      URL.revokeObjectURL(url)
      resolve(frames)
    }

    video.onerror = () => {
      clearTimeout(timeout)
      URL.revokeObjectURL(url)
      reject(new Error(`Failed to load video: ${videoFile.name}`))
    }

    video.src = url
    // iOS: force load
    video.load()
  })
}

/** Check if canvas content is blank/black (unsupported codec or not yet decoded) */
function isCanvasBlank(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const sampleW = Math.min(w, 50)
  const sampleH = Math.min(h, 50)
  const data = ctx.getImageData(0, 0, sampleW, sampleH).data
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 10 && (data[i] > 5 || data[i + 1] > 5 || data[i + 2] > 5)) return false
  }
  return true
}

/** Seek video to specific time and wait for frame to be ready */
function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error(`Seek timeout at ${time}s`)), 8000)
    video.onseeked = () => {
      clearTimeout(timeout)
      // Delay for frame to fully decode before canvas draw
      setTimeout(resolve, 150)
    }
    video.currentTime = time
  })
}

/**
 * Get video metadata without extracting frames.
 * Returns approximate capture date from file modified time.
 */
export function getVideoMeta(file: File): { durationEstimate: number | null; date: string | null } {
  const date = file.lastModified
    ? new Date(file.lastModified).toISOString().slice(0, 10)
    : null
  return { durationEstimate: null, date }
}

/** Check if a file is a video based on MIME type. */
export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/')
}

/**
 * Extract a short audio clip from a video file.
 * Returns a WAV Blob of the first `durationSeconds` of audio.
 */
export async function extractAudioClip(
  videoFile: File,
  durationSeconds = 15,
): Promise<Blob | null> {
  try {
    const arrayBuffer = await videoFile.arrayBuffer()
    const audioCtx = new AudioContext()
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer)

    const sampleRate = audioBuffer.sampleRate
    const numSamples = Math.min(sampleRate * durationSeconds, audioBuffer.length)

    const offlineCtx = new OfflineAudioContext(1, numSamples, sampleRate)
    const source = offlineCtx.createBufferSource()
    source.buffer = audioBuffer
    source.connect(offlineCtx.destination)
    source.start(0, 0, durationSeconds)

    const rendered = await offlineCtx.startRendering()
    const channelData = rendered.getChannelData(0)

    return encodeWav(channelData, sampleRate)
  } catch {
    return null
  }
}

/** Encode Float32Array PCM data as a WAV Blob */
function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i))
  }
  writeString(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeString(8, 'WAVE')
  writeString(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, sampleRate, true)
  view.setUint32(28, sampleRate * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  let offset = 44
  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]))
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
    offset += 2
  }

  return new Blob([buffer], { type: 'audio/wav' })
}
