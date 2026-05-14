"use client"

// ✅ DISABLE SES LOCKDOWN - FIXES 500 INTERNAL SERVER ERROR
// @ts-ignore
globalThis.__webpack_disable_ses_lockdown = true;

import * as React from "react"
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

export default function CallTVClient({ roomId, onCallEnded }: Props) {
  console.log('🏗️ CallTVClient outer rendering')
  return (
    <DailyProvider>
      <CallInner roomId={roomId} onCallEnded={onCallEnded} />
    </DailyProvider>
  )
}

function CallInner({ roomId, onCallEnded }: Props) {
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

  React.useEffect(() => {
    if (!callObject || hasJoined.current) return
    hasJoined.current = true
    const url = `https://resourceful.daily.co/${roomId}`
    console.log('🚀 Joining:', url)
    setIsJoining(true)
    callObject.join({ url, userName: 'User' })
      .then(() => {
        console.log('✅ JOINED!')
        setIsJoined(true)
        setIsJoining(false)
      })
      .catch(err => {
        console.error('❌ Failed:', err)
        setIsJoining(false)
      })
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

  // Screen sharing events
  useDailyEvent('local-screen-share-started', useCallback((ev) => {
    console.log('✅ Local screen share started:', ev)
    setIsLocalSharing(true)
    setSharingParticipantName('You')
  }, []))

  useDailyEvent('local-screen-share-stopped', useCallback((ev) => {
    console.log('👋 Local screen share stopped:', ev)
    setIsLocalSharing(false)
    setSharingParticipantName(null)
    setScreenShareTrack(null)
  }, []))

  useDailyEvent('participant-updated', useCallback((ev) => {
    const participant = ev.participant
    if (participant.screen) {
      const name = participant.local ? 'You' : participant.user_name || `Participant ${participant.session_id.slice(-4)}`
      setSharingParticipantName(name)
      if (participant.tracks?.screen?.track) {
        setScreenShareTrack(participant.tracks.screen.track)
      }
    } else if (participant.local && !participant.screen) {
      setSharingParticipantName(null)
      setScreenShareTrack(null)
    }
  }, []))

  // Attach screen share track
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

  useDailyEvent('joined-meeting', useCallback((e) => {
    console.log('✅ JOINED MEETING EVENT', e)
    setIsJoined(true)
    setIsJoining(false)
    setError(null)
  }, []))

  useDailyEvent('left-meeting', useCallback((e) => {
    console.log('👋 Left meeting:', e)
    setIsJoined(false)
    if (onCallEnded) {
      onCallEnded(finalDuration.current, finalParticipantCount.current)
    }
  }, [onCallEnded]))

  useDailyEvent('error', useCallback((e) => {
    console.log('❌ ERROR EVENT', e)
    setError(e.errorMsg)
  }, []))

  return (
    <div className="h-full bg-gray-50">
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
}