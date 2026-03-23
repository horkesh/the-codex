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

      // Calculate frame times
      const totalFrames = Math.min(
        Math.floor(duration / intervalSeconds),
        maxFrames
      )
      if (totalFrames === 0) {
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
      const ctx = canvas.getContext('2d', { willReadFrequently: true })!

      const frames: { blob: Blob; timestampSeconds: number }[] = []

      // Detect WebP support for toBlob
      const supportsWebP = canvas.toDataURL('image/webp').startsWith('data:image/webp')
      const mimeType = supportsWebP ? 'image/webp' : 'image/jpeg'
      const quality = supportsWebP ? 0.75 : 0.85

      for (const time of times) {
        try {
          const captured = await seekAndCapture(video, ctx, w, h, time)
          if (!captured) {
            console.warn(`Blank frame at ${time}s, skipping`)
            continue
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
    video.load()
  })
}

/**
 * Seek to a time, then use requestVideoFrameCallback (if available) to wait
 * for the browser to actually render the decoded frame before drawing.
 * Falls back to a generous timeout for browsers without RVFC.
 * Returns true if a non-blank frame was captured.
 */
async function seekAndCapture(
  video: HTMLVideoElement,
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  time: number,
): Promise<boolean> {
  // 1. Seek and wait for onseeked
  await new Promise<void>((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Seek timeout at ${time}s`)), 8000)
    video.onseeked = () => { clearTimeout(t); resolve() }
    video.currentTime = time
  })

  // 2. Briefly play + wait for actual frame render via requestVideoFrameCallback
  //    This forces the hardware decoder to produce a real frame on the compositor.
  const hasRVFC = 'requestVideoFrameCallback' in video
  if (hasRVFC) {
    try {
      await video.play()
      await new Promise<void>((resolve) => {
        (video as any).requestVideoFrameCallback(() => resolve())
        // Safety timeout — if RVFC never fires (codec unsupported), don't hang
        setTimeout(resolve, 1000)
      })
      video.pause()
    } catch {
      // play() rejected — fall through to direct draw
    }
  } else {
    // No RVFC — use a generous static delay
    await new Promise(r => setTimeout(r, 300))
  }

  // 3. Draw and check
  ctx.drawImage(video, 0, 0, w, h)
  if (!isCanvasBlank(ctx, w, h)) return true

  // 4. Retry once with extra delay (covers slow hardware decoders)
  await new Promise(r => setTimeout(r, 500))
  ctx.drawImage(video, 0, 0, w, h)
  return !isCanvasBlank(ctx, w, h)
}

/** Check if canvas content is blank/black — samples center region, not top-left */
function isCanvasBlank(ctx: CanvasRenderingContext2D, w: number, h: number): boolean {
  const sampleSize = 60
  const sx = Math.max(0, Math.floor((w - sampleSize) / 2))
  const sy = Math.max(0, Math.floor((h - sampleSize) / 2))
  const sw = Math.min(sampleSize, w)
  const sh = Math.min(sampleSize, h)
  const data = ctx.getImageData(sx, sy, sw, sh).data
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] > 10 && (data[i] > 5 || data[i + 1] > 5 || data[i + 2] > 5)) return false
  }
  return true
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
