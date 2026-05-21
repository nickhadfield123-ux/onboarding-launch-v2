import { useState, useCallback, useEffect } from 'react'

export function useRizz(roomId?: string) {
  const [rizzEnabled, setRizzEnabled] = useState(true)

  const toggleRizz = useCallback(async (next: boolean) => {
    setRizzEnabled(next)
    localStorage.setItem('rizzEnabled', next ? 'true' : 'false')

    if (!roomId) return

    const roomUrl = `https://resourceful.daily.co/${roomId}`

    if (next) {
      try {
        await fetch('/api/rizz-bot/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomUrl }),
        })
        console.log('[Rizz] turned ON mid-call')
      } catch (e) {
        console.log('[Rizz] start error (silent):', e)
      }
    } else {
      try {
        await fetch('/api/rizz-bot/stop', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomUrl }),
        })
        console.log('[Rizz] turned OFF mid-call')
      } catch (e) {
        console.log('[Rizz] stop error (silent):', e)
      }
    }
  }, [roomId])

  useEffect(() => {
    const stored = localStorage.getItem('rizzEnabled')

    if (stored === 'false') {
      toggleRizz(false)
    } else {
      // default is on (true or null) — do not call toggleRizz on initial load
      setRizzEnabled(true)

      if (roomId) {
        const roomUrl = `https://resourceful.daily.co/${roomId}`
        fetch('/api/rizz-bot/start', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomUrl }),
        })
          .then(() => console.log('[Rizz] bot start requested for', roomUrl))
          .catch((err) => console.log('[Rizz] bot start error (silent):', err))
      }
    }
  }, [roomId, toggleRizz])

  return { rizzEnabled, toggleRizz }
}
