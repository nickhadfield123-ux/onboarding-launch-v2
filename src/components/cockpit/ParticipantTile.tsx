"use client"

import * as React from "react"
import { useVideoTrack, useAudioTrack, useParticipant } from "@daily-co/daily-react"

interface ParticipantTileProps {
  sessionId: string
  isLocal?: boolean
}

export function ParticipantTile({ sessionId, isLocal = false }: ParticipantTileProps) {
  const videoTrack = useVideoTrack(sessionId)
  const audioTrack = useAudioTrack(sessionId)
  const participant = useParticipant(sessionId)
  
  const videoRef = React.useRef<HTMLVideoElement>(null)
  const prevTrackId = React.useRef<string | null>(null)

  // Attach video track to video element
  React.useEffect(() => {
    const track = videoTrack?.persistentTrack
    if (!track || !videoRef.current) return
    
    // Only update srcObject if the track ID has changed
    if (track.id === prevTrackId.current) return
    
    prevTrackId.current = track.id
    videoRef.current.srcObject = new MediaStream([track])
  }, [videoTrack?.persistentTrack?.id])

  // Handle audio track
  React.useEffect(() => {
    if (audioTrack?.persistentTrack) {
      // Audio tracks are handled automatically by Daily.co
      // No need to manually attach to audio elements
    }
  }, [audioTrack])

  if (!participant) {
    return (
      <div className="relative bg-slate-800 rounded-xl overflow-hidden h-full w-full">
        <div className="absolute inset-0 flex items-center justify-center text-white">
          <span className="text-sm">Loading participant...</span>
        </div>
      </div>
    )
  }

  const displayName = isLocal ? 'You' : (participant.user_name || 'Participant')

  return (
    <div className="relative bg-slate-800 rounded-xl overflow-hidden h-full w-full aspect-video min-h-[200px]">
      {/* Video Element */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={isLocal}
        className="absolute inset-0 w-full h-full object-contain bg-slate-700"
      />
      
      {/* Connecting Overlay */}
      {!videoTrack?.persistentTrack && (
        <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
          <div className="text-white/60 text-sm">
            {isLocal ? 'Camera off' : 'Connecting...'}
          </div>
        </div>
      )}
      
      {/* Name Badge */}
      <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-1 rounded text-xs text-white">
        {displayName}
        {isLocal && ' (You)'}
      </div>
      
      {/* Status Indicators */}
      <div className="absolute top-2 right-2 flex space-x-1">
        {/* Video Status */}
        {!videoTrack?.persistentTrack && (
          <div className="bg-red-500 text-white px-1 py-0.5 rounded text-xs">
            No Video
          </div>
        )}
        
        {/* Audio Status */}
        {!audioTrack?.persistentTrack && (
          <div className="bg-yellow-500 text-white px-1 py-0.5 rounded text-xs">
            Muted
          </div>
        )}
      </div>
    </div>
  )
}
