/**
 * Global audio manager — ensures only one narration plays at a time.
 * Stops on: route navigation, page visibility change (app backgrounded),
 * and when a new narration starts.
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

// Stop audio when app is backgrounded (phone locked, tab switched, app minimized)
if (typeof document !== 'undefined') {
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') stopGlobalAudio()
  })
}
