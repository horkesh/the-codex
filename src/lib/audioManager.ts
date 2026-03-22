/**
 * Global audio manager — ensures only one narration plays at a time
 * and stops all audio on route navigation.
 */
let currentAudio: HTMLAudioElement | null = null
let onStopCallback: (() => void) | null = null

/** Stop whatever is currently playing globally */
export function stopGlobalAudio() {
  if (currentAudio) {
    currentAudio.pause()
    currentAudio.currentTime = 0
    currentAudio = null
  }
  if (onStopCallback) {
    onStopCallback()
    onStopCallback = null
  }
}

/** Register an audio element as the globally playing one.
 *  Stops any previously playing audio first.
 *  @param onStop — called when this audio is stopped by another play or navigation
 */
export function setGlobalAudio(audio: HTMLAudioElement, onStop: () => void) {
  stopGlobalAudio()
  currentAudio = audio
  onStopCallback = onStop

  // Auto-clear when audio ends naturally
  const originalOnEnded = audio.onended
  audio.onended = (e) => {
    currentAudio = null
    onStopCallback = null
    if (typeof originalOnEnded === 'function') originalOnEnded.call(audio, e)
  }
}
