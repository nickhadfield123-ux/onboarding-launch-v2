"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import PlatformFrame from '@/components/shell/PlatformFrame'
import { RizzPanel } from '@/components/shell'
import { PreCallPage } from "@/components/cockpit/PreCallPage"
import { PostCallPage } from "@/components/cockpit/PostCallPage"
import CallTVClient from "../../../call-tv/[roomId]/CallTVClient"
import { Meeting } from "@/lib/meetings/types"

export default function RoomV2Page() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string
  
  // Read returnTo from URL query params for post-call redirect
  const [returnTo, setReturnTo] = React.useState('/v2/hub')
  
  React.useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const rt = searchParams.get('returnTo')
    if (rt) setReturnTo(rt)
  }, [])
  
  const [isLinkCopied, setIsLinkCopied] = React.useState(false)
  const [callHasStarted, setCallHasStarted] = React.useState(false)
  const [callHasEnded, setCallHasEnded] = React.useState(false)
  const [callDuration, setCallDuration] = React.useState(120)
  const [leftSidebarExpanded, setLeftSidebarExpanded] = React.useState(true)
  
  // Reset sidebar expanded state when transitioning between states
  React.useEffect(() => {
    if (!callHasStarted || callHasEnded) {
      setLeftSidebarExpanded(true)
    } else {
      setLeftSidebarExpanded(false)
    }
  }, [callHasStarted, callHasEnded])
  
  const mockMeeting: Meeting = {
    id: roomId,
    title: "Welcome to Resourceful",
    description: "This is your video call room",
    meeting_type: "team-sync",
    status: "scheduled",
    start_time: new Date(),
    end_time: new Date(Date.now() + 3600000),
    timezone: "UTC",
    all_day: false,
    created_by: "1",
    recording_enabled: false,
    visibility: "private",
    created_at: new Date(),
    updated_at: new Date()
  }

  const handleJoinCall = () => {
    console.log('✅ 🎯 JOIN CALL BUTTON CLICKED!')
    console.log('   Before: callHasStarted =', callHasStarted)
    setCallHasStarted(true)
    console.log('   After: callHasStarted = true')
    console.log('   ✅ CallTVClient SHOULD NOW BE MOUNTED')
  }

  const handleInviteUsers = (userIds: string[]) => {
    console.log('Invite users:', userIds)
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(typeof window !== 'undefined' ? window.location.href : '')
    setIsLinkCopied(true)
    setTimeout(() => setIsLinkCopied(false), 2000)
  }

  console.log('🔄 RoomV2Page rendering | callHasStarted =', callHasStarted)
  console.log('   ➡️ Rendering:', callHasStarted ? 'CALLTVCLIENT' : 'PRECALLPAGE')

  return (
    <PlatformFrame
      leftSidebar={{
        content: <div className="p-6"><h3 className="font-semibold mb-4">Participants</h3><p className="text-sm text-gray-500">Call controls will appear here</p></div>,
        expanded: leftSidebarExpanded,
        onToggle: () => setLeftSidebarExpanded(prev => !prev)
      }}
      rightSidebar={{
        content: <RizzPanel />,
        defaultExpanded: true
      }}
    >
      {callHasEnded ? (
        <div className="p-6 h-full overflow-auto bg-slate-900">
          <PostCallPage 
            meeting={mockMeeting}
            duration={callDuration}
            status="aborted"
            onBackToHub={() => router.push(returnTo)}
          />
        </div>
      ) : !callHasStarted ? (
        <div className="p-6 h-full overflow-auto bg-slate-900">
          {/* Pre-call header with prominent back-to-hub */}
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={() => router.push(returnTo)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold transition-colors shadow-md"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>
              Back to Hub
            </button>
            <span className="text-xs text-gray-400">Room: {roomId}</span>
          </div>
          <PreCallPage 
            meeting={mockMeeting}
            roomUrl={typeof window !== 'undefined' ? window.location.href : ''}
            onJoinCall={handleJoinCall}
            onInviteUsers={handleInviteUsers}
            onCopyLink={handleCopyLink}
            isLinkCopied={isLinkCopied}
            onCancel={() => router.push(returnTo)}
          />
        </div>
      ) : (
        <>
          {console.log('✅ 🔥 CALLTVCLIENT IS ACTUALLY BEING RENDERED RIGHT NOW!')}
          <CallTVClient 
            roomId={roomId}
            onCallEnded={(duration, participantCount) => {
              setCallDuration(duration)
              setCallHasEnded(true)
            }}
          />
        </>
      )}
    </PlatformFrame>
  )
}