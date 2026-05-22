"use client"

// ✅ DISABLE SES LOCKDOWN - FIXES 500 INTERNAL SERVER ERROR
// @ts-ignore
globalThis.__webpack_disable_ses_lockdown = true;

import * as React from "react"
import DailyIframe from '@daily-co/daily-js'
import { DailyProvider, useDaily, useDailyEvent, useParticipantIds, useLocalSessionId, useScreenShare, DailyVideo } from "@daily-co/daily-react"
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
import { RizzTile } from "@/components/RizzTile"

interface BountyAlert {
  text: string
  speaker: string
  claimed: boolean
  ts: string
}

interface Props {
  roomId: string
  onCallEnded?: (duration: number, participantCount: number) => void
}

export default function CallTVClient({ roomId, onCallEnded }: Props) {
  console.log('🏗️ CallTVClient outer rendering')

  const callObjectRef = React.useRef<any>(null)
  if (!callObjectRef.current) {
    callObjectRef.current = DailyIframe.createCallObject({
      audioSource: true,
      videoSource: true,
    })
  }

  const innerRef = React.useRef<React.ReactElement | null>(null)
  if (!innerRef.current) {
    innerRef.current = <CallInner roomId={roomId} onCallEnded={onCallEnded} />
  }

  return (
    <DailyProvider callObject={callObjectRef.current}>
      {innerRef.current}
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
  const bountyDismissTimers = React.useRef<NodeJS.Timeout[]>([])

  const [liveBounties, setLiveBounties] = React.useState<BountyAlert[]>([])
  const [callSummaryReady, setCallSummaryReady] = React.useState(false)

  const participantIds = useParticipantIds({ filter: 'remote' })
  const localSessionId = useLocalSessionId()
  const { screens } = useScreenShare()

  // All participants including local in one array
  const allIds = localSessionId
    ? [localSessionId, ...participantIds]
    : participantIds

  const totalTiles = allIds.length + 1 // +1 for RizzTile

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

  // ADDITION 1: Start Rizz bot when joined
  React.useEffect(() => {
    if (!isJoined) return
    const roomUrl = `https://resourceful.daily.co/${roomId}`
    fetch('/api/rizz-call/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomUrl }),
    })
      .then(r => r.json())
      .then(data => {
        if (data?.status === 'unavailable') console.warn('[rizz] start unavailable')
      })
      .catch(err => console.warn('[rizz] start failed silently:', err))
  }, [isJoined, roomId])

  // ADDITION 2: SSE listener for live Rizz events
  React.useEffect(() => {
    if (!isJoined) return
    const rizzUrl = process.env.NEXT_PUBLIC_RIZZ_SERVER_URL
    if (!rizzUrl) {
      console.warn('[rizz] NEXT_PUBLIC_RIZZ_SERVER_URL not set')
      return
    }
    const es = new EventSource(`${rizzUrl}/events/${roomId}`)
    es.onmessage = (ev) => {
      try {
        const { type, payload } = JSON.parse(ev.data)
        if (type === 'bounty_detected' && payload) {
          const alert: BountyAlert = {
            text: payload.text || '',
            speaker: payload.speaker || 'Someone',
            claimed: !!payload.claimed,
            ts: payload.ts || new Date().toISOString(),
          }
          setLiveBounties(prev => {
            const next = [alert, ...prev].slice(0, 3)
            return next
          })
          // auto-dismiss after 8s (tracked for cleanup)
          const t = setTimeout(() => {
            setLiveBounties(prev => prev.filter(b => b.ts !== alert.ts))
          }, 8000)
          bountyDismissTimers.current.push(t)
        } else if (type === 'call_ended') {
          setCallSummaryReady(true)
        }
        // 'transcript_line' ignored per spec
      } catch (e) {
        console.warn('[rizz] SSE parse error:', e)
      }
    }
    es.onerror = () => {
      // silent, will auto-reconnect or close on unmount
    }
    return () => {
      es.close()
      // clear any pending auto-dismiss timers to prevent setState after unmount
      bountyDismissTimers.current.forEach(clearTimeout)
      bountyDismissTimers.current = []
    }
  }, [isJoined, roomId])

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
    <div className="h-full flex flex-col bg-slate-900">
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
        <div className="w-full h-full p-4 flex flex-col">
          {!isJoined && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-white">
                <Video className="h-16 w-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg mb-2">Connecting to call...</p>
              </div>
            </div>
          )}

          {isJoined && (screens.length > 0 || screenShareTrack) && (
            <div className="flex flex-col h-full min-h-0">
              
              {/* Main screenshare area */}
              <div className="relative flex-1 min-h-0 bg-black rounded-lg overflow-hidden">
                
                {screens.length > 0 && (
                  <div className="w-full h-full">
                    {screens.map((screen) => (
                      <DailyVideo
                        key={screen.screenId}
                        automirror
                        sessionId={screen.session_id}
                        type="screenVideo"
                        className="w-full"
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      />
                    ))}
                  </div>
                )}

                {screens.length === 0 && screenShareTrack && (
                  <video ref={screenShareVideoRef}
                    className="w-full object-contain"
                    style={{ height: '100%' }}
                    autoPlay playsInline muted
                  />
                )}

                {/* sharing label overlay */}
                <div className="absolute inset-x-0 top-0 flex items-center 
                                justify-between p-3 bg-gradient-to-b 
                                from-black/60 to-transparent">
                  <span className="text-white text-sm font-medium">
                    📺 {sharingParticipantName || 'Someone'} is sharing
                  </span>
                </div>

                {isLocalSharing && (
                  <Button
                    onClick={toggleScreenShare}
                    className="absolute bottom-3 right-3 bg-blue-600 
                               hover:bg-blue-700 text-white px-4 py-2 
                               rounded-lg z-10"
                  >
                    Stop Sharing
                  </Button>
                )}
              </div>

              {/* Minimised participant strip — shown during screenshare */}
              <div className="flex flex-row gap-2 p-2 overflow-x-auto shrink-0">
                {allIds.map(id => (
                  <div key={id} className="relative w-24 h-16 bg-slate-800 
                                            rounded-lg overflow-hidden shrink-0
                                            flex items-center justify-center">
                    <DailyVideo
                      sessionId={id}
                      type="video"
                      automirror={id === localSessionId}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div className="absolute bottom-0 inset-x-0 text-center 
                                    text-[10px] text-white bg-black/40 py-0.5">
                      {id === localSessionId ? 'You' : 'Guest'}
                    </div>
                  </div>
                ))}
                
                {/* Rizz always visible in strip during screenshare */}
                <div className="shrink-0">
                  <RizzTile isSpeaking={false} lastWords="" />
                </div>
              </div>

            </div>
          )}

          {/* Multi-Participant Grid Layout */}
          {isJoined && !(screens.length > 0 || screenShareTrack) && (
            <div className={`
               grid gap-3 p-4 w-full h-full
               ${totalTiles === 1 ? 'grid-cols-1' : ''}
               ${totalTiles === 2 ? 'grid-cols-2' : ''}
               ${totalTiles >= 3 ? 'grid-cols-2 grid-rows-2' : ''}
             `}>
               {allIds.map(id => (
                 <ParticipantTile
                   key={id}
                   sessionId={id}
                   isLocal={id === localSessionId}
                 />
                ))}
                 {/* Rizz bot tile - full size participant card inside the same grid (no absolute, matches ParticipantTile dimensions) */}
                 <div className="relative bg-slate-800 rounded-xl overflow-hidden flex items-center justify-center">
                   {/* @ts-expect-error — isListening passed per addition spec; RizzTile interface only declares isSpeaking + lastWords (runtime safe) */}
                   <RizzTile isSpeaking={false} isListening={true} />
                 </div>
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

           {/* ADDITION 3: Bounty alert strip (max 3, auto-dismiss 8s) */}
           {liveBounties.length > 0 && (
             <div className="absolute bottom-20 left-4 right-4 flex flex-wrap gap-2 z-10">
                 {liveBounties.map((bounty, idx) => (
                   <div
                     key={`${bounty.ts}-${idx}`}
                     className="flex-1 min-w-[220px] bg-slate-800/95 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white flex items-center gap-2 shadow-xl"
                     style={{ animation: 'fadeUp 0.2s ease-out' }}
                   >
                     <span className="text-[#2d9e6b] font-semibold truncate max-w-[80px]">{bounty.speaker}</span>
                     <span className="text-slate-300 truncate flex-1">{bounty.text.length > 60 ? bounty.text.slice(0, 57) + '...' : bounty.text}</span>
                     {bounty.claimed ? (
                       <span className="ml-auto text-[10px] px-1.5 py-0 rounded bg-green-500/20 text-green-400 border border-green-500/30">Claimed</span>
                     ) : (
                       <span className="ml-auto text-[10px] px-1.5 py-0 rounded bg-slate-600/80 text-slate-400">Open</span>
                     )}
                   </div>
                 ))}
               </div>
           )}

           {/* ADDITION 3: View summary pill when call_ended received */}
           {callSummaryReady && (
             <a
               href={`/call/${roomId}/summary`}
               className="absolute top-4 right-4 bg-slate-800/90 hover:bg-slate-700 border border-[#6c42c2]/60 text-white text-sm px-3 py-1 rounded-full flex items-center gap-1 z-20 shadow-md"
             >
               View summary →
             </a>
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