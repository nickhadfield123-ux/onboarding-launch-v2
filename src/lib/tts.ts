/**
 * Safe TTS utility with proper null checks for browser speechSynthesis
 * Handles SSR safety and browser compatibility
 */

// Module-level voice caching
let cachedVoices: SpeechSynthesisVoice[] = []
let audioUnlocked = false

// Initialize voices on voiceschanged event
if (typeof window !== 'undefined' && typeof speechSynthesis !== 'undefined') {
  speechSynthesis.onvoiceschanged = () => {
    console.log('[tts] voiceschanged event fired')
    cachedVoices = speechSynthesis.getVoices()
    console.log('[tts] Cached voices:', cachedVoices.map(v => v.name))
  }
}

/**
 * Initialize audio context by speaking a silent utterance
 * This unlocks speechSynthesis for subsequent calls in Chrome
 */
export const initAudio = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      console.warn('[tts] SSR environment, skipping audio init')
      resolve()
      return
    }

    if (typeof speechSynthesis === 'undefined' || !speechSynthesis) {
      console.warn('[tts] speechSynthesis not supported')
      resolve()
      return
    }

    // Only need to unlock once
    if (audioUnlocked) {
      console.log('[tts] Audio already unlocked')
      resolve()
      return
    }

    console.log('[tts] Initializing audio context...')
    
    const unlock = new SpeechSynthesisUtterance('')
    unlock.volume = 0
    unlock.rate = 1.0
    unlock.pitch = 1.0

    unlock.onend = () => {
      console.log('[tts] Audio context unlocked')
      audioUnlocked = true
      resolve()
    }

    unlock.onerror = (event) => {
      console.warn('[tts] Audio init error:', event.error)
      // Continue anyway - unlock might fail on some browsers
      audioUnlocked = true
      resolve()
    }

    try {
      speechSynthesis.speak(unlock)
    } catch (error) {
      console.warn('[tts] Audio init failed:', error)
      audioUnlocked = true
      resolve()
    }
  })
}

/**
 * Gets cached voices or tries to get fresh voices
 */
export const getVoices = (): SpeechSynthesisVoice[] => {
  if (!isSpeechSynthesisSupported()) return []
  
  // Return cached voices if available
  if (cachedVoices.length > 0) {
    return cachedVoices
  }
  
  // Try to get fresh voices
  const freshVoices = speechSynthesis.getVoices()
  if (freshVoices.length > 0) {
    console.log('[tts] Got fresh voices:', freshVoices.map(v => v.name))
    cachedVoices = freshVoices
    return freshVoices
  }
  
  return []
}

function findMaleVoice(): SpeechSynthesisVoice | null {
  const voices = getVoices()
  console.log('[tts] findMaleVoice called with', voices.length, 'voices')
  
  if (voices.length === 0) {
    console.warn('[tts] No voices available for male voice selection')
    return null
  }
  
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
    if (voice) {
      console.log('[tts] Found male voice:', voice.name)
      return voice
    }
  }
  
  // Fallback: look for any male voice
  const maleVoice = voices.find(v => 
    v.name.toLowerCase().includes('male') || 
    v.name.toLowerCase().includes('man')
  )
  if (maleVoice) {
    console.log('[tts] Found fallback male voice:', maleVoice.name)
    return maleVoice
  }
  
  console.log('[tts] No male voice found')
  return null
}

/**
 * Speaks text using the Web Speech API
 * @param text Text to speak
 * @param options Optional voice configuration and callbacks
 */
export const speak = (text: string, options?: {
  rate?: number
  pitch?: number
  volume?: number
  lang?: string
  onProgress?: (displayedText: string) => void
}): Promise<void> => {
  console.log('[tts] speak() called for text of length', text.length, 'chars')
  
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

    // Try to unlock audio context
    if (!audioUnlocked) {
      console.log('[tts] Audio not unlocked, attempting to init...')
      initAudio()
        .then(() => {
          console.log('[tts] Audio unlocked, proceeding with speech')
          doSpeak(text, options, resolve, reject)
        })
        .catch(err => {
          console.warn('[tts] Audio unlock failed, proceeding anyway:', err)
          doSpeak(text, options, resolve, reject)
        })
    } else {
      doSpeak(text, options, resolve, reject)
    }
  })
}

function doSpeak(
  text: string, 
  options: { rate?: number; pitch?: number; volume?: number; lang?: string; onProgress?: (displayedText: string) => void } = {},
  resolve: () => void,
  reject: (reason?: any) => void
): void {
  console.log('[tts] doSpeak() called')
  
  // Check if voices are loaded
  const voices = getVoices()
  console.log('[tts] getVoices() returned', voices.length, 'voices')
  
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
  utterance.onstart = () => {
    console.log('[tts] Speech started')
  }

  utterance.onend = () => {
    console.log('[tts] Speech completed')
    resolve()
  }

  utterance.onerror = (event) => {
    console.error('[tts] Speech synthesis error:', event.error)
    reject(new Error(`Speech synthesis error: ${event.error}`))
  }

  // Handle word-by-word text reveal via boundary events
  if (options.onProgress) {
    utterance.onboundary = (event) => {
      if (event.name === 'word') {
        const displayedText = text.substring(0, event.charIndex + event.charLength)
        options.onProgress?.(displayedText)
      }
    }
    
    // Fallback: also fire onstart in case onboundary never fires
    utterance.onstart = () => {
      console.log('[tts] Speech started')
      options.onProgress?.('')
    }
  }

  try {
    console.log('[tts] Calling speechSynthesis.speak()')
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
 * Gets the best male voice available
 */
export const getMaleVoice = (): SpeechSynthesisVoice | null => {
  return findMaleVoice()
}

/**
 * Checks if audio is unlocked
 */
export const isAudioUnlocked = (): boolean => {
  return audioUnlocked
}