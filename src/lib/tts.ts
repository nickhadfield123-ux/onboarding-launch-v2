/**
 * Safe TTS utility with proper null checks for browser speechSynthesis
 * Handles SSR safety and browser compatibility
 */

/**
 * Speaks text using the Web Speech API
 * @param text Text to speak
 * @param options Optional voice configuration
 */
export const speak = (text: string, options?: {
  rate?: number
  pitch?: number
  volume?: number
  lang?: string
}): Promise<void> => {
  return new Promise((resolve, reject) => {
    // SSR safety check
    if (typeof window === 'undefined') {
      console.warn('[tts] speechSynthesis unavailable in SSR environment')
      resolve()
      return
    }

    // Browser safety check
    if (typeof speechSynthesis === 'undefined' || !speechSynthesis) {
      console.warn('[tts] speechSynthesis not supported in this browser')
      resolve()
      return
    }

    // Check if browser has speech synthesis capabilities
    if (speechSynthesis.onvoiceschanged !== undefined) {
      speechSynthesis.onvoiceschanged = () => {
        doSpeak(text, options, resolve, reject)
      }
    } else {
      doSpeak(text, options, resolve, reject)
    }
  })
}

function doSpeak(
  text: string, 
  options: { rate?: number; pitch?: number; volume?: number; lang?: string } = {},
  resolve: () => void,
  reject: (reason?: any) => void
): void {
  const utterance = new SpeechSynthesisUtterance(text)
  
  // Set optional parameters
  utterance.rate = options.rate ?? 1.0
  utterance.pitch = options.pitch ?? 1.0
  utterance.volume = options.volume ?? 1.0
  utterance.lang = options.lang ?? 'en-US'

  // Event handlers
  utterance.onend = () => {
    resolve()
  }

  utterance.onerror = (event) => {
    console.error('[tts] Speech synthesis error:', event.error)
    reject(new Error(`Speech synthesis error: ${event.error}`))
  }

  try {
    speechSynthesis.speak(utterance)
  } catch (error) {
    console.error('[tts] Failed to speak:', error)
    reject(error)
  }
}

/**
 * Cancels any ongoing speech synthesis
 */
export const cancel = (): void => {
  if (typeof window === 'undefined') return
  
  if (typeof speechSynthesis !== 'undefined' && speechSynthesis) {
    try {
      speechSynthesis.cancel()
    } catch (error) {
      console.warn('[tts] Failed to cancel speech synthesis:', error)
    }
  }
}

/**
 * Checks if speech synthesis is supported in the current environment
 */
export const isSpeechSynthesisSupported = (): boolean => {
  return typeof window !== 'undefined' && 
         typeof speechSynthesis !== 'undefined' && 
         !!speechSynthesis
}

/**
 * Gets available voices
 */
export const getVoices = (): SpeechSynthesisVoice[] => {
  if (!isSpeechSynthesisSupported()) return []
  
  // Wait for voices to be loaded
  if (speechSynthesis.onvoiceschanged !== undefined) {
    return speechSynthesis.getVoices()
  }
  
  return []
}