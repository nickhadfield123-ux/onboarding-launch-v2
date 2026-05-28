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

function findMaleVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices()
  
  // Priority order for male voices
  const priorityPatterns = [
    /Google UK English Male/i,
    /Microsoft.*Male/i,
    /Male/i,
    /Daniel/i,
    /David/i,
    /James/i,
    /Ryan/i,
  ]
  
  // Check for exact matches first
  for (const pattern of priorityPatterns) {
    const voice = voices.find(v => pattern.test(v.name))
    if (voice) return voice
  }
  
  // Fallback: look for any male voice
  const maleVoice = voices.find(v => 
    v.name.toLowerCase().includes('male') || 
    v.name.toLowerCase().includes('man')
  )
  if (maleVoice) return maleVoice
  
  return null
}

function doSpeak(
  text: string, 
  options: { rate?: number; pitch?: number; volume?: number; lang?: string } = {},
  resolve: () => void,
  reject: (reason?: any) => void
): void {
  const utterance = new SpeechSynthesisUtterance(text)
  
  // Find male voice
  const maleVoice = findMaleVoice()
  if (maleVoice) {
    utterance.voice = maleVoice
    console.log('[tts] Using male voice:', maleVoice.name)
  } else {
    // Fallback: make default voice sound more masculine
    utterance.pitch = 0.8
    utterance.rate = 0.95
    console.log('[tts] No male voice found, using fallback pitch/rate')
  }
  
  // Set optional parameters
  utterance.rate = options.rate ?? utterance.rate
  utterance.pitch = options.pitch ?? utterance.pitch
  utterance.volume = options.volume ?? 1.0
  utterance.lang = options.lang ?? 'en-US'

  // Event handlers
  utterance.onend = () => {
    console.log('[tts] Speech completed')
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

/**
 * Gets the best male voice available
 */
export const getMaleVoice = (): SpeechSynthesisVoice | null => {
  return findMaleVoice()
}