"use client"

import { DailyProvider, useDaily, useDailyEvent, useParticipantIds, useLocalSessionId, DailyVideo } from '@daily-co/daily-react'
import DailyIframe from '@daily-co/daily-js'
import { useEffect, useRef, useState } from 'react'

interface Props {
  roomId: string
  onCallEnded?: (duration: number, participantCount: number) => void
}

// Singleton call object at module scope
let _co: any = null
function getCallObject() {
  if (!_co) _co = DailyIframe.createCallObject()
  return _co
}

// Inner component — uses Daily hooks which handle their own state
function CallInner({ roomUrl }: { roomUrl: string }) {
  const daily = useDaily()
  const joined = useRef(false)
  const localId = useLocalSessionId()
  const participantIds = useParticipantIds({ filter: 'remote' })
  const [screenShareTile, setScreenShareTile] = useState<MediaStream | null>(null)

  useEffect(() => {
    if (!daily || joined.current) return
    joined.current = true
    daily.join({ url: roomUrl, audioSource: true, videoSource: true })
  }, [daily])

  useDailyEvent('track-started', (e: any) => {
    if (e.track?.type === 'screenVideo') {
      setScreenShareTile(new MediaStream([e.track.track]))
    }
  })

  useDailyEvent('track-stopped', (e: any) => {
    if (e.track?.type === 'screenVideo') {
      setScreenShareTile(null)
    }
  })

  return (
    <div style={{ background: '#000', width: '100%', height: '100vh', display: 'flex', flexDirection: 'column', padding: '12px', gap: '12px' }}>
      {screenShareTile && (
        <video
          autoPlay playsInline
          style={{ width: '100%', borderRadius: '12px' }}
          ref={el => { if (el) el.srcObject = screenShareTile }}
        />
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: 1 }}>
        {localId && <DailyVideo sessionId={localId} mirror type="video" style={{ width: '200px', borderRadius: '8px' }} />}
        {participantIds.map(id => (
          <DailyVideo key={id} sessionId={id} type="video" style={{ width: '200px', borderRadius: '8px' }} />
        ))}
      </div>
    </div>
  )
}

// Outer component wraps with DailyProvider
export default function CallTVClient({ roomId }: Props) {
  const callObject = getCallObject()
  const roomUrl = `https://resourceful.daily.co/meeting-temp-1-fixed`
  return (
    <DailyProvider callObject={callObject}>
      <CallInner roomUrl={roomUrl} />
    </DailyProvider>
  )
}