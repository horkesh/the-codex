/**
 * Extract keyframes from a video file using HTML Canvas.
 * Returns an array of { blob, timestamp } for each extracted frame.
 * Strategy: Extract 1 frame every `intervalSeconds` (default 3s).
 * Cap at `maxFrames` (default 10).
 */
export async function extractKeyframes(
  videoFile: File,
  options: { intervalSeconds?: number; maxFrames?: number; maxWidth?: number } = {}
): Promise<{ blob: Blob; timestampSeconds: number }[]> {
  const { intervalSeconds = 3, maxFrames = 10, maxWidth = 1024 } = options

  const url = URL.createObjectURL(videoFile)
  const video = document.createElement('video')
  video.muted = true
  video.preload = 'auto'

  return new Promise((resolve, reject) => {
    video.onloadedmetadata = async () => {
      const duration = video.duration
      if (!duration || !isFinite(duration)) {
        URL.revokeObjectURL(url)
        resolve([])
        return
      }

      const totalFrames = Math.min(Math.floor(duration / intervalSeconds), maxFrames)
      const times: number[] = []
      for (let i = 0; i < totalFrames; i++) {
        times.push(i * intervalSeconds + intervalSeconds / 2)
      }

      const scale = Math.min(1, maxWidth / video.videoWidth)
      const w = Math.round(video.videoWidth * scale)
      const h = Math.round(video.videoHeight * scale)
      const canvas = document.createElement('canvas')
      canvas.width = w
      canvas.height = h
      const ctx = canvas.getContext('2d')!

      const frames: { blob: Blob; timestampSeconds: number }[] = []

      for (const time of times) {
        try {
          await seekTo(video, time)
          ctx.drawImage(video, 0, 0, w, h)
          const blob = await new Promise<Blob>((res, rej) => {
            canvas.toBlob(b => b ? res(b) : rej(new Error('toBlob failed')), 'image/webp', 0.75)
          })
          frames.push({ blob, timestampSeconds: time })
        } catch {
          // Skip frames that fail
        }
      }

      URL.revokeObjectURL(url)
      resolve(frames)
    }

    video.onerror = () => {
      URL.revokeObjectURL(url)
      reject(new Error('Failed to load video'))
    }

    video.src = url
  })
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Seek timeout')), 5000)
    video.onseeked = () => { clearTimeout(timeout); resolve() }
    video.currentTime = time
  })
}

export function getVideoMeta(file: File): { durationEstimate: number | null; date: string | null } {
  const date = file.lastModified ? new Date(file.lastModified).toISOString().slice(0, 10) : null
  return { durationEstimate: null, date }
}

export function isVideoFile(file: File): boolean {
  return file.type.startsWith('video/')
}

/**
 * Extract a short audio clip from a video file.
 * Returns a WAV Blob of the first N seconds of audio.
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
