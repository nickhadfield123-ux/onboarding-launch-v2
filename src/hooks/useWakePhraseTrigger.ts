/**
 * Hook for detecting wake phrases like "hey rizz" using Web Speech API
 * Provides clean interface for wake phrase detection with proper cleanup
 */

import { useState, useEffect, useRef, useCallback } from 'react'

export interface WakePhraseTriggerOptions {
  /** Wake phrase pattern (default: "hey rizz") */
  pattern?: string
  /** Language for speech recognition (default: 'en-US') */
  lang?: string
  /** Whether to listen continuously (default: true) */
  continuous?: boolean
  /** Whether to return interim results (default: false) */
  interimResults?: boolean
  /** Timeout before restarting after error (ms) (default: 10000) */
  restartTimeout?: number
}

export interface WakePhraseTriggerResult {
  /** Whether the wake phrase has been detected */
  triggerDetected: boolean
  /** The last detected transcript */
  transcript: string
  /** Whether the speech recognition is actively listening */
  isListening: boolean
  /** Error message if speech recognition fails */
  error: string | null
  /** Function to manually start listening */
  start: () => void
  /** Function to manually stop listening */
  stop: () => void
}

const defaultOptions: Required<WakePhraseTriggerOptions> = {
  pattern: '\\bhey\\s+rizz?\\b',
  lang: 'en-US',
  continuous: true,
  interimResults: false,
  restartTimeout: 10000,
}

export const useWakePhraseTrigger = (
  onWakePhraseDetected?: (transcript: string) => void,
  options: WakePhraseTriggerOptions = {}
): WakePhraseTriggerResult => {
  const finalOptions = { ...defaultOptions, ...options }
  const [triggerDetected, setTriggerDetected] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const isMounted = useRef(true)
  const recognitionRef = useRef<any>(null)
  const isStartingRef = useRef(false)

  // Initialize speech recognition
  const initRecognition = useCallback(() => {
    if (typeof window === 'undefined') return
    
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser')
      return
    }

    try {
      recognitionRef.current = new SpeechRecognition()
      recognitionRef.current.continuous = finalOptions.continuous
      recognitionRef.current.interimResults = finalOptions.interimResults
      recognitionRef.current.lang = finalOptions.lang

      // Reset states when recognition restarts
      recognitionRef.current.onstart = () => {
        setIsListening(true)
        setError(null)
      }

      recognitionRef.current.onend = () => {
        if (!isMounted.current) return
        
        // Only restart if we're still mounted and the error wasn't fatal
        if (!error && !isStartingRef.current) {
          isStartingRef.current = true
          setTimeout(() => {
            if (isMounted.current && isListening) {
              start()
            }
            isStartingRef.current = false
          }, finalOptions.restartTimeout)
        }
        setIsListening(false)
      }

      recognitionRef.current.onerror = (event: any) => {
        console.error('[wake-phrase] Speech recognition error:', event.error)
        setError(`Speech recognition error: ${event.error}`)
        
        // Stop listening on error
        setIsListening(false)
        
        // Don't restart if we get "no-speech" error
        if (event.error === 'no-speech') {
          console.warn('[wake-phrase] No speech detected, restarting...')
          isStartingRef.current = true
          setTimeout(() => {
            if (isMounted.current && isListening) {
              start()
            }
            isStartingRef.current = false
          }, 1000) // Quick restart for no-speech
        }
      }

      recognitionRef.current.onresult = (event: any) => {
        const results = event.results
        if (results.length > 0) {
          const lastResult = results[results.length - 1]
          if (lastResult.isFinal) {
            const transcript = lastResult[0].transcript.trim()
            setTranscript(transcript)
            
            // Check if this matches our wake phrase pattern with stricter validation
            if (matchesWakePhrase(transcript)) {
              setTriggerDetected(true)
              onWakePhraseDetected?.(transcript)
              
              // Clear trigger after a short delay so it can be detected again
              setTimeout(() => setTriggerDetected(false), 1000)
            }
          }
        }
      }
    } catch (err) {
      console.error('[wake-phrase] Failed to initialize speech recognition:', err)
      setError('Failed to initialize speech recognition')
    }
  }, [finalOptions, onWakePhraseDetected, error, isListening])

  // Check if transcript matches wake phrase more strictly
  const matchesWakePhrase = (text: string): boolean => {
    try {
      const regex = new RegExp(finalOptions.pattern, 'i')
      const match = text.match(regex)
      
      if (!match) return false
      
      // Get the matched phrase
      const matchedPhrase = match[0]
      const startIndex = text.indexOf(matchedPhrase)
      const endIndex = startIndex + matchedPhrase.length
      
      // Check if the match is a complete word (not part of a larger word)
      const beforeChar = startIndex > 0 ? text[startIndex - 1] : ' '
      const afterChar = endIndex < text.length ? text[endIndex] : ' '
      
      // Ensure the match is at word boundaries
      const atWordBoundary = !/[a-zA-Z0-9]/.test(beforeChar) && !/[a-zA-Z0-9]/.test(afterChar)
      
      if (atWordBoundary) {
        console.log('[wake-phrase] Valid wake phrase detected:', matchedPhrase)
        return true
      }
      
      console.log('[wake-phrase] Potential false positive:', {
        text,
        matchedPhrase,
        beforeChar,
        afterChar,
        atWordBoundary,
      })
      
      return false
    } catch (err) {
      console.error('[wake-phrase] Error matching wake phrase:', err)
      return false
    }
  }

  // Start listening
  const start = useCallback(() => {
    if (!isMounted.current || recognitionRef.current) return
    
    initRecognition()
    
    if (recognitionRef.current) {
      try {
        recognitionRef.current.start()
      } catch (err) {
        console.error('[wake-phrase] Failed to start recognition:', err)
        setError('Failed to start speech recognition')
      }
    }
  }, [initRecognition])

  // Stop listening
  const stop = useCallback(() => {
    if (!isMounted.current) return
    
    isStartingRef.current = false
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop()
        recognitionRef.current = null
      } catch (err) {
        console.error('[wake-phrase] Failed to stop recognition:', err)
      }
    }
    setIsListening(false)
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isMounted.current = false
      stop()
    }
  }, [stop])

  // Initialize recognition when component mounts
  useEffect(() => {
    if (isMounted.current) {
      start()
    }
  }, [start])

  return {
    triggerDetected,
    transcript,
    isListening,
    error,
    start,
    stop,
  }
}