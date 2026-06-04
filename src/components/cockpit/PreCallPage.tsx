"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Meeting } from "@/lib/meetings/types"
import { useCall, useRizz } from "@/lib/cockpit/context"
import { getHubUrl } from "@/lib/utils"
import {
  Video,
  Users,
  Link2,
  Copy,
  Check,
  UserPlus,
  Play,
  MapPin,
  MessageCircle,
  FileText,
  Home
} from "lucide-react"

// Agenda items for the demo build-review call. Used in the
// pre-call Agenda section and the post-call Rizz summary.
const DEMO_AGENDA = [
  "Introductions — Nick, Rishi & Arjun (NexFlow)",
  "Platform demo — Rizz on a live call",
  "NexFlow infrastructure update — 3 months in the codebase",
  "What's coming — autonomous agents, contributor onboarding, scale",
  "Open discussion & next steps",
]

// Demo roster for the Resourceful × NexFlow build-review room.
// When the meeting id starts with "meeting-temp-" the PreCallPage
// uses this fixed roster and the demo Team Context panel below,
// overriding the default MOCK_USERS + meeting_type-driven copy.
// Order: NexFlow co-founders first (Rishi, Arjun), then Nick as
// Host, then Rizz as the always-present AI assistant. No avatar
// URLs — initials in a coloured circle are rendered instead.
const DEMO_PARTICIPANTS = [
  {
    id: "rishi",
    display_name: "Rishi Yedavalli",
    role: "NexFlow, Co-founder",
    is_online: true,
    status: "Online, Attendee",
  },
  {
    id: "arjun",
    display_name: "Arjun Dixit",
    role: "NexFlow, Co-founder",
    is_online: true,
    status: "Online, Attendee",
  },
  {
    id: "nick",
    display_name: "Nick Hadfield",
    role: "Resourceful, Founder",
    is_online: true,
    status: "Online, Host",
  },
  {
    id: "rizz",
    display_name: "Rizz",
    role: "AI Assistant",
    is_online: true,
    status: "Always present",
  },
]

// Generic mock roster (used for non-demo rooms).
const MOCK_USERS = [
  { id: "1", display_name: "Sarah Chen", is_online: true },
  { id: "2", display_name: "Marcus Webb", is_online: true },
  { id: "3", display_name: "Elena Rodriguez", is_online: false },
  { id: "4", display_name: "James Kim", is_online: true },
  { id: "5", display_name: "Priya Patel", is_online: false },
]

// Stable colour palette for initials avatars (used in demo + mock lists).
const AVATAR_PALETTE = [
  "bg-indigo-600",
  "bg-emerald-600",
  "bg-amber-600",
  "bg-rose-600",
  "bg-sky-600",
  "bg-violet-600",
]

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .map((w) => w[0] ?? "")
    .join("")
    .slice(0, 2)
    .toUpperCase()
}

function getAvatarColor(id: string): string {
  const idx = id.charCodeAt(0) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[idx]
}

function InitialsAvatar({ id, name, online }: { id: string; name: string; online: boolean }) {
  return (
    <div className="relative">
      <div
        className={`h-8 w-8 rounded-full ${getAvatarColor(id)} text-white text-xs font-semibold flex items-center justify-center select-none`}
        aria-label={name}
        title={name}
      >
        {getInitials(name)}
      </div>
      <div
        className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
          online ? "bg-green-500" : "bg-gray-400"
        }`}
      />
    </div>
  )
}

interface PreCallPageProps {
  meeting: Meeting
  roomUrl: string
  onJoinCall: () => void
  onInviteUsers: (userIds: string[]) => void
  onCopyLink: () => void
  isLinkCopied: boolean
}

export function PreCallPage({
  meeting,
  roomUrl,
  onJoinCall,
  onInviteUsers,
  onCopyLink,
  isLinkCopied,
}: PreCallPageProps) {
  console.log("🎨 PreCallPage rendering with:", { meeting, roomUrl })

  const { dispatch: rizzDispatch } = useRizz()
  const [showInviteModal, setShowInviteModal] = React.useState(false)
  const [selectedUsers, setSelectedUsers] = React.useState<Set<string>>(new Set())

  // Demo-mode flag: true for the Resourceful × NexFlow build-review
  // room (and any other "meeting-temp-" room used for the demo).
  const isDemoRoom = typeof meeting.id === "string" && meeting.id.startsWith("meeting-temp-")
  const displayTitle = isDemoRoom ? "Resourceful × NexFlow — Build Review" : meeting.title
  const activeParticipants = isDemoRoom ? DEMO_PARTICIPANTS : MOCK_USERS

  React.useEffect(() => {
    rizzDispatch({ type: "SET_MODE", payload: "pre-call" })
  }, [rizzDispatch])

  const toggleUser = (userId: string) => {
    const newSelected = new Set(selectedUsers)
    if (newSelected.has(userId)) {
      newSelected.delete(userId)
    } else {
      newSelected.add(userId)
    }
    setSelectedUsers(newSelected)
  }

  const handleInvite = () => {
    onInviteUsers(Array.from(selectedUsers))
    setSelectedUsers(new Set())
    setShowInviteModal(false)
  }

  return (
    <div className="space-y-8 text-white">
      {/* Meeting Header */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
          size="default"
          onClick={() => {
            const hubUrl = getHubUrl()
            window.location.href = hubUrl
          }}
          className="flex items-center gap-2 bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
        >
          <Home className="h-4 w-4" />
          Return to Hub
        </Button>

        <div className="flex gap-2">
          <Button
            variant="outline"
            size="default"
            onClick={() => setShowInviteModal(true)}
            className="flex items-center gap-2 bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
          >
            <UserPlus className="h-4 w-4" />
            Invite People
          </Button>

          <button
            onClick={() => onJoinCall()}
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-semibold px-6 py-2.5 rounded-lg transition-colors duration-150 text-sm shadow-sm h-10"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21" />
            </svg>
            Join Call
          </button>
        </div>
      </div>

      {/* Title block — demo gets spacious treatment, generic gets the original h1 */}
      {isDemoRoom ? (
        <div className="space-y-2 py-6 border-b border-slate-700/50">
          <h1 className="text-4xl font-bold tracking-tight text-white">{displayTitle}</h1>
          <div className="flex flex-wrap items-center gap-3 text-sm text-slate-300">
            <Badge variant="outline" className="border-slate-600 text-slate-200">
              Upcoming Call
            </Badge>
            <span>·</span>
            <span>
              {new Date(meeting.start_time).toLocaleString([], {
                weekday: "long",
                month: "long",
                day: "numeric",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </span>
            <span>·</span>
            <span>
              {Math.round(
                (new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime()) /
                  (1000 * 60)
              )}{" "}
              min
            </span>
          </div>
        </div>
      ) : (
        <div className="flex-1 space-y-2 mx-6">
          <h1 className="text-2xl font-bold text-white">{displayTitle}</h1>
          {meeting.description && <p className="text-muted-foreground">{meeting.description}</p>}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {isDemoRoom ? (
            <>
              {/* Agenda — the primary content for the demo build-review */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <FileText className="h-6 w-6" />
                    Agenda
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    {DEMO_AGENDA.map((item, idx) => (
                      <li key={idx} className="flex gap-4">
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-slate-700 text-slate-200 text-sm font-semibold flex items-center justify-center">
                          {idx + 1}
                        </div>
                        <div className="text-base text-slate-100 leading-relaxed pt-1">{item}</div>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>

              {/* Call Actions — same as before, demo gets Join Call Now + Invite */}
              <Card>
                <CardHeader>
                  <CardTitle>Call Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Button
                      onClick={() => onJoinCall()}
                      className="flex items-center gap-2 bg-primary hover:bg-primary/90 flex-1"
                    >
                      <Play className="h-4 w-4" />
                      Join Call Now
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowInviteModal(true)}
                      className="flex items-center gap-2 flex-1 bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                    >
                      <UserPlus className="h-4 w-4" />
                      Invite More
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    The call will start in a separate window. You can invite more people before joining.
                  </div>
                </CardContent>
              </Card>

              {/* Room Information — moved to the bottom, smaller and understated */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm text-slate-400">
                    <Link2 className="h-4 w-4" />
                    Room Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs text-slate-400">Room URL</div>
                      <div className="font-mono text-xs text-slate-300 truncate">{roomUrl}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCopyLink()}
                      className="flex items-center gap-2 bg-slate-800 border-slate-600 text-white hover:bg-slate-700 shrink-0"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {isLinkCopied ? "Copied!" : "Copy"}
                    </Button>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>Virtual</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{DEMO_PARTICIPANTS.length} participants</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Room Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" />
                    Room Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                    <div className="flex-1">
                      <div className="text-sm text-muted-foreground">Room URL</div>
                      <div className="font-mono text-sm">{roomUrl}</div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onCopyLink()}
                      className="flex items-center gap-2 bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                    >
                      <Copy className="h-4 w-4" />
                      {isLinkCopied ? "Copied!" : "Copy"}
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-muted-foreground" />
                      <span>Location: Virtual</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-muted-foreground" />
                      <span>
                        Duration:{" "}
                        {Math.round(
                          (new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime()) /
                            (1000 * 60)
                        )}{" "}
                        min
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Participants — generic rooms keep participants in the main column */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Participants
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Online Now</div>
                      <div className="space-y-2">
                        {MOCK_USERS.filter((u) => u.is_online).map((user) => (
                          <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                            <InitialsAvatar id={user.id} name={user.display_name} online />
                            <div className="flex-1">
                              <div className="font-medium">{user.display_name}</div>
                              <div className="text-xs text-muted-foreground">Online</div>
                            </div>
                            <Badge variant="secondary" className="text-xs">Host</Badge>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm font-medium text-muted-foreground mb-2">Expected</div>
                      <div className="space-y-2">
                        {MOCK_USERS.filter((u) => !u.is_online).map((user) => (
                          <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                            <InitialsAvatar id={user.id} name={user.display_name} online={false} />
                            <div className="flex-1">
                              <div className="font-medium">{user.display_name}</div>
                              <div className="text-xs text-muted-foreground">Offline</div>
                            </div>
                            <Badge variant="outline" className="text-xs">Attendee</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Call Actions */}
              <Card>
                <CardHeader>
                  <CardTitle>Call Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex gap-3">
                    <Button
                      onClick={() => onJoinCall()}
                      className="flex items-center gap-2 bg-primary hover:bg-primary/90 flex-1"
                    >
                      <Play className="h-4 w-4" />
                      Join Call Now
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => setShowInviteModal(true)}
                      className="flex items-center gap-2 flex-1 bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                    >
                      <UserPlus className="h-4 w-4" />
                      Invite More
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground text-center">
                    The call will start in a separate window. You can invite more people before joining.
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Right column — Participants for the demo, original meeting-type context for generic rooms */}
        <div className="space-y-6">
          {isDemoRoom ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Participants
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {DEMO_PARTICIPANTS.map((user) => {
                    const isHost = user.status.includes("Host")
                    const isAi = user.role === "AI Assistant"
                    return (
                      <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                        <InitialsAvatar id={user.id} name={user.display_name} online={!!user.is_online} />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{user.display_name}</div>
                          <div className="text-xs text-muted-foreground truncate">{user.role}</div>
                        </div>
                        <Badge
                          variant={isHost ? "secondary" : isAi ? "default" : "outline"}
                          className="text-xs shrink-0"
                        >
                          {isHost ? "Host" : isAi ? "AI" : "Attendee"}
                        </Badge>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          ) : meeting.meeting_type === "team-sync" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Team Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Recent Project Updates</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• Sprint planning completed yesterday</div>
                    <div>• API integration in progress</div>
                    <div>• Design review scheduled for Friday</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Previous Decisions</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• Tech stack: React + Next.js</div>
                    <div>• Database: PostgreSQL with Supabase</div>
                    <div>• Authentication: NextAuth.js</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Action Items</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• Review API endpoints</div>
                    <div>• Update project documentation</div>
                    <div>• Plan next sprint</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : meeting.meeting_type === "strategy" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Strategy Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Business Goals</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• Q4 revenue targets</div>
                    <div>• Market expansion plans</div>
                    <div>• Product roadmap priorities</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Key Metrics</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• Customer acquisition cost</div>
                    <div>• Lifetime value</div>
                    <div>• Market share growth</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Strategic Initiatives</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• New market entry</div>
                    <div>• Partnership opportunities</div>
                    <div>• Technology investments</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : meeting.meeting_type === "co-creation" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageCircle className="h-5 w-5" />
                  Collaboration Context
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Project Details</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• Project: Innovation Workshop</div>
                    <div>• Participants: Cross-functional team</div>
                    <div>• Duration: 2 hours</div>
                    <div>• Location: Virtual collaboration space</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Collaboration Goals</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• Ideation and brainstorming</div>
                    <div>• Problem-solving session</div>
                    <div>• Solution prototyping</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Expected Outcomes</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• New product concepts</div>
                    <div>• Process improvements</div>
                    <div>• Innovation roadmap</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="w-full max-w-md mx-4">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Invite People
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowInviteModal(false)}>✕</Button>
            </CardHeader>
            <CardContent>
              <div className="max-h-64 overflow-auto space-y-2 mb-4">
                {activeParticipants.map((user: any) => {
                  const isOnline = user.is_online ?? true
                  return (
                    <div
                      key={user.id}
                      onClick={() => toggleUser(user.id)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedUsers.has(user.id)
                          ? "bg-primary/20 border border-primary"
                          : "hover:bg-muted"
                      }`}
                    >
                      <InitialsAvatar id={user.id} name={user.display_name} online={isOnline} />
                      <div className="flex-1">
                        <div className="font-medium">{user.display_name}</div>
                        <div className="text-xs text-muted-foreground">{user.role ?? (isOnline ? "Online" : "Offline")}</div>
                      </div>
                      {selectedUsers.has(user.id) && (
                        <Check className="h-5 w-5 text-primary" />
                      )}
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 bg-slate-800 border-slate-600 text-white hover:bg-slate-700" onClick={() => setShowInviteModal(false)}>
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleInvite}
                  disabled={selectedUsers.size === 0}
                >
                  Invite {selectedUsers.size > 0 ? `(${selectedUsers.size})` : ""}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
