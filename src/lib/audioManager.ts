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
    currentAudio.onended = null
    currentAudio.onerror = null
    currentAudio = null
  }
  if (onStopCallback) {
    onStopCallback()
    onStopCallback = null
  }
}

/** Register an audio element as the globally playing one.
 *  Stops any previously playing audio first.
 *  Sets onended/onerror to auto-clear global state + call onStop.
 */
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
