/**
 * Global audio manager — ensures only one narration plays at a time.
 * Stops on: route navigation, page swipe, and app backgrounded (with delay).
 */
let currentAudio: HTMLAudioElement | null = null
let onStopCallback: (() => void) | null = null

/** Stop whatever is currently playing globally */
export function stopGlobalAudio() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio.onended = null
    currentAudio.onerror = null
    currentAudio = null
  }
  if (onStopCallback) {
    onStopCallback()
    onStopCallback = null
  }
}

/** Register an audio element as the globally playing one. */
export function setGlobalAudio(audio: HTMLAudioElement, onStop: () => void) {
  stopGlobalAudio()
  currentAudio = audio
  onStopCallback = onStop

  audio.onended = () => {
    currentAudio = null
    onStopCallback = null
    onStop()
  }
  audio.onerror = () => {
    currentAudio = null
    onStopCallback = null
    onStop()
  }
}

// Stop audio when app is truly backgrounded (not brief UI overlays).
// 2s delay: if visibility returns within 2s, don't stop (handles keyboard, share sheet, etc.)
if (typeof document !== 'undefined') {
  let hideTimer: ReturnType<typeof setTimeout> | null = null
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      hideTimer = setTimeout(() => stopGlobalAudio(), 2000)
    } else {
      if (hideTimer) { clearTimeout(hideTimer); hideTimer = null }
    }
  })
}
