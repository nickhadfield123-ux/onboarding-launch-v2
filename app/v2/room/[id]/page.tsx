"use client"

import * as React from "react"
import dynamic from "next/dynamic"
import { useParams, useRouter } from "next/navigation"
import PlatformFrame from '@/components/shell/PlatformFrame'
import { RizzPanel } from '@/components/shell'
import { PostCallPage } from "@/components/cockpit/PostCallPage"
import { Meeting } from "@/lib/meetings/types"
const MemoCallTV = dynamic(() => import("../../../call-tv/[roomId]/CallTVClient"), { ssr: false })
const PreCallPage = dynamic(() => import("@/components/cockpit/PreCallPage").then(mod => mod.PreCallPage), { ssr: false })
import { getHubUrl } from "@/lib/utils"
import { RizzTile } from "@/components/RizzTile"
import { useRizz } from "@/hooks/useRizz"

export default function RoomV2Page() {
  const parentRenderCount = React.useRef(0)
  console.log('RoomV2Page render #' + (++parentRenderCount.current))
  const params = useParams()
  const router = useRouter()
  const roomId = params.id as string
  
  const [isLinkCopied, setIsLinkCopied] = React.useState(false)
  const [callHasStarted, setCallHasStarted] = React.useState(false)
  const [callHasEnded, setCallHasEnded] = React.useState(false)
  const [callDuration, setCallDuration] = React.useState(120)
  const [leftSidebarExpanded, setLeftSidebarExpanded] = React.useState(true)

  // Diagnostic: track each sidebar effect dep individually to identify the culprit

  React.useEffect(() => {
    console.log('DEP CHANGED: callHasStarted =', callHasStarted);
  }, [callHasStarted]);
  React.useEffect(() => {
    console.log('DEP CHANGED: callHasEnded =', callHasEnded);
  }, [callHasEnded]);

  // Keep left sidebar (with Rizz toggle + tile) visible during pre-call and active call.
  // Only collapse it after the call has ended.
  React.useEffect(() => {
    console.log('SIDEBAR EFFECT running, deps:', { callHasStarted, callHasEnded });
    if (callHasEnded) {
      setLeftSidebarExpanded(false)
    } else {
      setLeftSidebarExpanded(true)
    }
  }, [callHasEnded])

  const { rizzEnabled, toggleRizz } = useRizz(roomId)


  // Stabilize leftSidebar prop to prevent unnecessary re-renders in PlatformFrame
  const leftSidebar = React.useMemo(() => ({
    content: (
      <div className="p-6">
        <h3 className="font-semibold mb-3">Participants</h3>

        {/* Rizz toggle pill (small, in sidebar) */}
        <div className="mb-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-700">Rizz</span>
            <button
              onClick={() => toggleRizz(!rizzEnabled)}
              className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${rizzEnabled ? 'bg-[#534AB7]' : 'bg-gray-300'}`}
            >
              <span
                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${rizzEnabled ? 'translate-x-4.5' : 'translate-x-0.5'}`}
              />
            </button>
          </div>
          <div className="text-[10px] text-slate-500 mt-0.5">{rizzEnabled ? 'On — will join' : 'Off'}</div>
        </div>

        {/* Only show RizzTile when enabled */}
        {rizzEnabled && <RizzTile isSpeaking={false} lastWords="Listening..." />}
      </div>
    ),
    expanded: leftSidebarExpanded,
    onToggle: () => setLeftSidebarExpanded(prev => !prev)
  }), [leftSidebarExpanded, rizzEnabled, toggleRizz])
  
  const mockMeeting = React.useMemo<Meeting>(() => ({
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
  }), [])

  const handleJoinCall = () => {
    console.log('✅ 🎯 JOIN CALL BUTTON CLICKED!')
    console.log('   Before: callHasStarted =', callHasStarted)
    setCallHasStarted(true)
    console.log('   After: callHasStarted = true')
    console.log('   ✅ CallTVClient SHOULD NOW BE MOUNTED')
  }

  const handleCallEnded = React.useCallback((duration: number, participantCount: number) => {
    setCallDuration(duration)
    setCallHasEnded(true)
  }, [])

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

  const rightSidebar = React.useMemo(() => ({
    content: <RizzPanel />,
    defaultExpanded: true
  }), [])

  return (
    <PlatformFrame
      leftSidebar={leftSidebar}
      rightSidebar={rightSidebar}
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
          {console.log('MemoCallTV props check:', {
            roomId,
            onCallEnded: handleCallEnded.toString().slice(0, 50),
            onCallEndedRef: handleCallEnded,
          })}
          <MemoCallTV 
            roomId={roomId}
            onCallEnded={handleCallEnded}
          />
        </>
      )}
    </PlatformFrame>
  )
}