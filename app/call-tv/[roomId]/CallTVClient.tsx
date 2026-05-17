"use client"

// ✅ DISABLE SES LOCKDOWN - FIXES 500 INTERNAL SERVER ERROR
// @ts-ignore
globalThis.__webpack_disable_ses_lockdown = true;



import * as React from "react"
import DailyIframe from '@daily-co/daily-js'
import { DailyProvider, useDaily, useDailyEvent, useParticipantIds, useLocalSessionId } from "@daily-co/daily-react"
import { useMemo, useCallback } from "react"
import {
  ArrowLeft,
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Phone,
  PhoneOff,
  Users,
  Copy,
  Loader2,
  Sparkles,
  Settings,
  Maximize2,
  Minimize2,
  Send
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ParticipantTile } from "@/components/cockpit/ParticipantTile"

interface Props {
  roomId: string
  onCallEnded?: (duration: number, participantCount: number) => void
}

const CallTVClient = React.memo(function CallTVClient({ roomId, onCallEnded }: Props) {
  const callObjectRef = React.useRef<any>(null)
  if (!callObjectRef.current) {
    callObjectRef.current = DailyIframe.createCallObject()
  }

  const stableCallObject = React.useMemo(() => callObjectRef.current, [])

  return (
    <DailyProvider callObject={stableCallObject}>
      <CallInner roomId={roomId} onCallEnded={onCallEnded} />
    </DailyProvider>
  )
})

export default CallTVClient

const CallInner = React.memo(function CallInner({ roomId, onCallEnded }: Props) {
  console.log('🔵 CallInner IS MOUNTING')
  const callObject = useDaily()
  console.log('📞 callObject:', callObject)
  const hasJoined = React.useRef(false)

  const [isJoined, setIsJoined] = React.useState(false)
  const [isJoining, setIsJoining] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [duration, setDuration] = React.useState(0)
  const durationRef = React.useRef<NodeJS.Timeout | null>(null)

  // Screen sharing state
  const [screenShareTrack, setScreenShareTrack] = React.useState<MediaStreamTrack | null>(null)
  const [isLocalSharing, setIsLocalSharing] = React.useState(false)
  const [sharingParticipantName, setSharingParticipantName] = React.useState<string | null>(null)
  const screenShareVideoRef = React.useRef<HTMLVideoElement>(null)

  const participantIds = useParticipantIds({ filter: 'remote' })
  const localSessionId = useLocalSessionId()

  // All participants including local in one array
  const allIds = localSessionId
    ? [localSessionId, ...participantIds]
    : participantIds

  const audioEls = React.useRef<Map<string, HTMLAudioElement>>(new Map())

  React.useEffect(() => {
    if (!callObject || hasJoined.current) return
    hasJoined.current = true
    const url = `https://resourceful.daily.co/${roomId}`
    console.log('🚀 Joining:', url)
    setIsJoining(true)

    callObject.join({ url, userName: 'User', audioSource: true, videoSource: true })
      .then(() => {
        console.log('✅ JOINED!')
        setIsJoined(true)
        setIsJoining(false)
      })
      .catch(err => {
        console.error('❌ Failed:', err)
        setIsJoining(false)
      })

    // === Remote audio + screen share tile handlers ===
    const handleTrackStarted = (e: any) => {
      const p = e.participant

      // Remote audio
      if (!p.local && e.track.kind === 'audio') {
        const sid = p.session_id
        if (audioEls.current.has(sid)) return
        const el = document.createElement('audio')
        el.autoplay = true
        el.srcObject = new MediaStream([e.track])
        document.body.appendChild(el)
        audioEls.current.set(sid, el)
      }

      // Screen share
      if (e.track.type === 'screenVideo') {
        const el = document.getElementById('screen-share-tile') as HTMLVideoElement | null
        if (el) {
          el.srcObject = new MediaStream([e.track.track])
          el.style.display = 'block'
          el.play().catch(() => {})
        }
      }
    }

    const handleTrackStopped = (e: any) => {
      if (e.track.type === 'screenVideo') {
        const el = document.getElementById('screen-share-tile') as HTMLVideoElement | null
        if (el) {
          el.srcObject = null
          el.style.display = 'none'
        }
      }
    }

    const handleParticipantLeft = (e: any) => {
      const el = audioEls.current.get(e.participant.session_id)
      if (el) {
        el.pause()
        el.srcObject = null
        el.remove()
        audioEls.current.delete(e.participant.session_id)
      }
    }

    callObject.on('track-started', handleTrackStarted)
    callObject.on('track-stopped', handleTrackStopped)
    callObject.on('participant-left', handleParticipantLeft)

    return () => {
      callObject.off('track-started', handleTrackStarted)
      callObject.off('track-stopped', handleTrackStopped)
      callObject.off('participant-left', handleParticipantLeft)

      // Cleanup any remaining audio elements
      audioEls.current.forEach((el) => {
        el.pause()
        el.srcObject = null
        el.remove()
      })
      audioEls.current.clear()
    }
  }, [callObject, roomId])

  // Call duration timer
  React.useEffect(() => {
    if (isJoined) {
      durationRef.current = setInterval(() => {
        setDuration(d => d + 1)
      }, 1000)
    } else {
      if (durationRef.current) {
        clearInterval(durationRef.current)
        durationRef.current = null
      }
      setDuration(0)
    }
    return () => {
      if (durationRef.current) {
        clearInterval(durationRef.current)
      }
    }
  }, [isJoined])

  // Toggle microphone
  const toggleMicrophone = async () => {
    if (callObject) {
      const isMuted = callObject.localAudio()
      await callObject.setLocalAudio(!isMuted)
    }
  }

  // Toggle camera
  const toggleCamera = async () => {
    if (callObject) {
      const isVideoOff = callObject.localVideo()
      await callObject.setLocalVideo(!isVideoOff)
    }
  }

  // Toggle screen share
  const toggleScreenShare = async () => {
    if (!callObject) return
    try {
      if (isLocalSharing) {
        await callObject.stopScreenShare()
      } else {
        await callObject.startScreenShare()
      }
    } catch (err) {
      console.error('❌ Screen share error:', err)
    }
  }

  // Handle leave
  const handleLeave = async () => {
    await callObject?.leave()
    setIsJoined(false)
    if (onCallEnded) {
      onCallEnded(duration, allIds.length)
    }
  }

  // Store final values before call ends
  const finalDuration = React.useRef(0)
  const finalParticipantCount = React.useRef(1)

  // Keep track of final values when call is active
  React.useEffect(() => {
    if (isJoined) {
      finalDuration.current = duration
      finalParticipantCount.current = allIds.length
    }
  }, [isJoined, duration, allIds.length])

  // Attach screen share track (kept for backward compatibility with existing UI)
  React.useEffect(() => {
    if (screenShareVideoRef.current && screenShareTrack) {
      const stream = new MediaStream([screenShareTrack])
      screenShareVideoRef.current.srcObject = stream
      screenShareVideoRef.current.play().catch(err => {
        console.error('❌ Failed to play screen share video:', err)
      })
    } else if (screenShareVideoRef.current) {
      screenShareVideoRef.current.srcObject = null
    }
  }, [screenShareTrack])

  return (
    <div className="h-full bg-slate-900">
      {/* Header Bar */}
      <header className="bg-slate-900 border-b border-slate-700 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
            <span className="font-semibold text-white">{roomId || 'Video Call'}</span>
            {isJoined && (
              <Badge variant="secondary" className="ml-2 bg-slate-700 text-white border-slate-600">
                {allIds.length} participant{allIds.length !== 1 ? 's' : ''}
              </Badge>
            )}
            {isJoined && (
              <Badge variant="outline" className="ml-2 text-xs text-white border-slate-600">
                {Math.floor(duration / 60).toString().padStart(2, '0')}:{(duration % 60).toString().padStart(2, '0')}
              </Badge>
            )}
          </div>
        </div>
      </header>

      {/* Video Area */}
      <main className="h-[calc(100%-56px)] bg-slate-900 relative">
        <div className="w-full h-full p-4">
          {!isJoined && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Connecting to call...</p>
              </div>
            </div>
          )}

          {/* Screen Share Layout */}
          {isJoined && screenShareTrack && (
            <div className="relative w-full h-full bg-black">
              <video
                ref={screenShareVideoRef}
                className="w-full h-full object-contain"
                autoPlay
                playsInline
                muted
              />
              <div className="absolute bottom-4 left-4 bg-black/50 text-white px-4 py-2 rounded-full text-sm">
                📺 {sharingParticipantName || 'Someone'} is sharing
              </div>
              {isLocalSharing && (
                <Button
                  onClick={toggleScreenShare}
                  className="absolute bottom-4 right-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg"
                >
                  Stop Sharing
                </Button>
              )}
            </div>
          )}

          {/* Dedicated Screen Share Tile (hidden by default) */}
          <video
            id="screen-share-tile"
            autoPlay
            playsInline
            style={{ display: 'none', width: '100%', borderRadius: '12px', marginBottom: '12px' }}
          />

          {/* Multi-Participant Grid Layout */}
          {isJoined && !screenShareTrack && (
            <div className={`
              grid gap-3 p-4 w-full h-full
              ${allIds.length === 1 ? 'grid-cols-1' : ''}
              ${allIds.length === 2 ? 'grid-cols-2' : ''}
              ${allIds.length >= 3 ? 'grid-cols-2 grid-rows-2' : ''}
            `}>
              {allIds.map(id => (
                <ParticipantTile
                  key={id}
                  sessionId={id}
                  isLocal={id === localSessionId}
                />
              ))}
            </div>
          )}

          {/* Call Status Overlay */}
          {isJoined && (
            <div className="absolute bottom-4 left-4 bg-black/50 rounded-lg px-3 py-2">
              <div className="flex items-center space-x-2 text-white">
                <Users className="h-4 w-4" />
                <span className="text-sm">{allIds.length} in call</span>
              </div>
            </div>
          )}
        </div>

        {/* Call Controls Overlay */}
        {isJoined && (
          <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/50 rounded-full p-2">
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleMicrophone}
                className="text-white hover:text-white hover:bg-white/20"
              >
                <Mic className="h-5 w-5" />
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={toggleCamera}
                className="text-white hover:text-white hover:bg-white/20"
              >
                <Video className="h-5 w-5" />
              </Button>

              <Button
                variant={isLocalSharing ? "default" : "ghost"}
                size="icon"
                onClick={toggleScreenShare}
                className={isLocalSharing
                  ? "bg-blue-600 text-white hover:bg-blue-700"
                  : "text-white hover:text-white hover:bg-white/20"
                }
              >
                <Monitor className="h-5 w-5" />
              </Button>

              <div className="w-px h-8 bg-white/20 mx-2" />

              <Button
                variant="destructive"
                size="icon"
                onClick={handleLeave}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                <PhoneOff className="h-5 w-5" />
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
})