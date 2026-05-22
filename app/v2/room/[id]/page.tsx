"use client"

import * as React from "react"
import { useParams, useRouter } from "next/navigation"
import PlatformFrame from '@/components/shell/PlatformFrame'
import { RizzPanel } from '@/components/shell'
import { PreCallPage } from "@/components/cockpit/PreCallPage"
import { PostCallPage } from "@/components/cockpit/PostCallPage"
import CallTVClient from "../../../call-tv/[roomId]/CallTVClient"
import { Meeting } from "@/lib/meetings/types"
import { getHubUrl } from "@/lib/utils"

export default function RoomV2Page() {
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string
  
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
    start_time: new Date(),
    end_time: new Date(Date.now() + 3600000),
    timezone: "UTC",
    all_day: false,
    status: "scheduled",
    created_by: "1",
    recording_enabled: true,
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
            onBackToHub={() => {
              const hubUrl = getHubUrl()
              window.location.href = hubUrl
            }}
          />
        </div>
      ) : !callHasStarted ? (
        <div className="p-6 h-full overflow-auto bg-slate-900">
          <PreCallPage 
            meeting={mockMeeting}
            roomUrl={typeof window !== 'undefined' ? window.location.href : ''}
            onJoinCall={handleJoinCall}
            onInviteUsers={handleInviteUsers}
            onCopyLink={handleCopyLink}
            isLinkCopied={isLinkCopied}
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