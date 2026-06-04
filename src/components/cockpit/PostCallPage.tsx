"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Meeting } from "@/lib/meetings/types"
import { useCall, useRizz } from "@/lib/cockpit/context"
import { getHubUrl } from "@/lib/utils"
import { 
  Video, 
  Users,
  Calendar,
  Clock,
  Link2,
  Copy,
  Check,
  ChevronRight,
  Loader2,
  UserPlus,
  Play,
  Pause,
  MapPin,
  MessageCircle,
  FileText,
  Camera,
  Mic,
  MicOff,
  Video as VideoIcon,
  VideoOff,
  CheckCircle,
  XCircle,
  Save,
  Sparkles,
  RotateCcw,
  Home
} from "lucide-react"

// Post-call content for the demo build-review room. Kept as plain
// string constants so the JSX is clean and the copy is easy to
// tweak for the demo video.
const POST_CALL_KEY_MOMENTS = [
  "Nick walked Rishi and Arjun through the live Resourceful dashboard and the Rizz intro flow end-to-end.",
  "Rishi mapped the current infrastructure — Next.js, Supabase, Daily.co — and flagged Postgres connection-pool limits under load.",
  "Arjun demoed NexFlow's GitHub contributor onboarding framework and how it maps to Resourceful's open issues.",
  "Rizz logged two open architecture threads (multi-tenant data model, agent runtime isolation) and proposed a follow-up doc.",
]
const POST_CALL_DECISIONS = [
  "NexFlow continues as embedded contributors for the next quarter, with a focus on the agent runtime.",
  "Infrastructure mapping doc to be co-authored by Rishi and shared by Friday.",
  "Rizz becomes a first-class call participant in every Resourceful × NexFlow review.",
]
const POST_CALL_ACTION_ITEMS = [
  "Nick: send Rishi the Postgres pool config so he can size the next migration.",
  "Rishi: draft the infrastructure doc and share by Friday.",
  "Arjun: file the three highest-leverage onboarding issues in the Resourceful repo.",
  "Rizz: auto-generate a per-call architecture brief ahead of the next review.",
]

// Demo roster for the Resourceful × NexFlow build-review room.
// Matches PreCallPage so the post-call list shows the same people.
const DEMO_PARTICIPANTS = [
  { id: "rishi", display_name: "Rishi Yedavalli", role: "NexFlow, Co-founder" },
  { id: "arjun", display_name: "Arjun Dixit", role: "NexFlow, Co-founder" },
  { id: "nick", display_name: "Nick Hadfield", role: "Resourceful, Founder" },
  { id: "rizz", display_name: "Rizz", role: "AI Assistant" },
]

// Generic mock roster (used for non-demo rooms).
const MOCK_USERS = [
  { id: "1", display_name: "Sarah Chen", is_online: true },
  { id: "2", display_name: "Marcus Webb", is_online: true },
  { id: "3", display_name: "Elena Rodriguez", is_online: false },
  { id: "4", display_name: "James Kim", is_online: true },
  { id: "5", display_name: "Priya Patel", is_online: false },
]

interface PostCallPageProps {
  meeting: Meeting
  duration?: number
  status?: 'completed' | 'aborted' | 'cancelled'
  onBackToHub?: () => void
  onSaveNotes?: (notes: string) => void
}

export function PostCallPage({ 
  meeting, 
  duration = 0,
  status = 'aborted',
  onBackToHub,
  onSaveNotes
}: PostCallPageProps) {

  const { dispatch: rizzDispatch } = useRizz()
  const [notes, setNotes] = React.useState('')

  // Set Rizz mode to post-call when component mounts
  React.useEffect(() => {
    rizzDispatch({ type: 'SET_MODE', payload: 'summary' })
  }, [rizzDispatch])

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return '< 1 minute'
    const mins = Math.round(seconds / 60)
    return `${mins} minute${mins !== 1 ? 's' : ''}`
  }

  const handleSaveNotes = () => {
    if (onSaveNotes) {
      onSaveNotes(notes)
    }
  }

  const handleClearNotes = () => {
    setNotes('')
  }

  // Demo-mode flag: true for the Resourceful × NexFlow build-review
  // room. Mirrors the same flag in PreCallPage.
  const isDemoRoom = typeof meeting.id === "string" && meeting.id.startsWith("meeting-temp-")
  const displayTitle = isDemoRoom ? "Resourceful × NexFlow — Build Review" : meeting.title
  const postCallParticipants = isDemoRoom ? DEMO_PARTICIPANTS : MOCK_USERS

  return (
    <div className="space-y-8 text-white">
      {/* Meeting Header — Return to Hub left, Back to Hub right */}
      <div className="flex items-center justify-between pt-2">
        <Button
          variant="outline"
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
            variant="secondary"
            onClick={onBackToHub}
            className="flex items-center gap-2 bg-slate-700 text-white hover:bg-slate-600"
          >
            <Home className="h-4 w-4" />
            Back to Hub
          </Button>
        </div>
      </div>

      {/* Title block — demo gets spacious treatment matching the pre-call header */}
      {isDemoRoom ? (
        <div className="space-y-2 py-6 border-b border-slate-700/50">
          <h1 className="text-4xl font-bold tracking-tight text-white">{displayTitle}</h1>
          <p className="text-base text-slate-300">Session Summary & Next Steps</p>
        </div>
      ) : (
        <div className="flex-1 space-y-2 mx-6">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(duration)}
          </Badge>
          <h1 className="text-2xl font-bold text-white">{displayTitle}</h1>
          <p className="text-gray-300">Session Summary & Next Steps</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {isDemoRoom ? (
            <>
              {/* Rizz Summary — large, auto-expanding primary card */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <Sparkles className="h-6 w-6" />
                    Rizz Summary
                  </CardTitle>
                  <p className="text-sm text-slate-400">Generated from this call's transcript</p>
                </CardHeader>
                <CardContent className="space-y-5">
                  <p className="text-base text-slate-100 leading-relaxed">
                    Nick and the NexFlow team (Rishi and Arjun) ran a focused 90-minute build
                    review of the Resourceful platform. Nick walked Rishi and Arjun through
                    the live dashboard and the Rizz intro flow, Rishi mapped the current
                    Next.js / Supabase / Daily.co infrastructure and flagged Postgres
                    connection-pool limits under load, and Arjun demoed NexFlow's GitHub
                    contributor onboarding framework. Rizz logged two open architecture
                    threads (multi-tenant data model, agent runtime isolation) and
                    proposed a follow-up doc. The team agreed to keep NexFlow embedded as
                    contributors for the next quarter, with a focus on the agent
                    runtime and a joint infra-mapping doc due Friday.
                  </p>
                </CardContent>
              </Card>

              {/* Key Moments — prominent below the summary, same numbered-list
                  treatment as the pre-call agenda so the two pages feel
                  visually paired. */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <FileText className="h-6 w-6" />
                    Key Moments
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    {POST_CALL_KEY_MOMENTS.map((item, idx) => (
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

              {/* Decisions + Action Items — same as Key Moments, in matching
                  numbered treatment. */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <FileText className="h-6 w-6" />
                    Decisions
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    {POST_CALL_DECISIONS.map((item, idx) => (
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

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-2xl">
                    <FileText className="h-6 w-6" />
                    Action Items
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-4">
                    {POST_CALL_ACTION_ITEMS.map((item, idx) => (
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

              {/* Save Your Notes — practical at-a-glance capture for the user */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Save Your Notes
                  </CardTitle>
                  <p className="text-sm text-slate-400">Capture any thoughts or ideas before leaving</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Type any notes, ideas, or thoughts here..."
                    className="min-h-[120px] resize-none"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveNotes}
                      className="flex items-center gap-2 bg-primary hover:bg-primary/90 flex-1"
                    >
                      <Save className="h-4 w-4" />
                      Save Notes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleClearNotes}
                      className="flex items-center gap-2 flex-1"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Session Details — moved to the bottom, smaller and understated */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-sm text-slate-400">
                    <FileText className="h-4 w-4" />
                    Session Details
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5" />
                      <span>{formatDuration(duration)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users className="h-3.5 w-3.5" />
                      <span>{postCallParticipants.length} attendees</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>
                        {new Date(meeting.start_time).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle className="h-3.5 w-3.5" />
                      <span>Meeting completed</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          ) : (
            <>
              {/* Non-demo: Session Details + Participants in main column,
                  meeting-type context in right column (original layout). */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Session Details
                  </CardTitle>
                  <p className="text-sm text-slate-400">Key information about your call</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Duration</div>
                      <div className="font-medium">{formatDuration(duration)}</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Participants</div>
                      <div className="font-medium">{postCallParticipants.length}</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Recording</div>
                      <div className="font-medium">Enabled</div>
                    </div>
                    <div className="p-3 bg-muted rounded-lg">
                      <div className="text-sm text-muted-foreground mb-1">Status</div>
                      <div className="font-medium">Meeting completed</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Participants
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {postCallParticipants.map((user) => (
                      <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{user.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{user.display_name}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5" />
                    Save Your Notes
                  </CardTitle>
                  <p className="text-sm text-slate-400">Capture any thoughts or ideas before leaving</p>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Textarea
                    placeholder="Type any notes, ideas, or thoughts here..."
                    className="min-h-[120px] resize-none"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                  <div className="flex gap-3">
                    <Button
                      onClick={handleSaveNotes}
                      className="flex items-center gap-2 bg-primary hover:bg-primary/90 flex-1"
                    >
                      <Save className="h-4 w-4" />
                      Save Notes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleClearNotes}
                      className="flex items-center gap-2 flex-1"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Clear
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Right column — Participants for the demo, original meeting-type
            context for generic rooms. */}
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
                  {postCallParticipants.map((user) => {
                    const isHost = (user as any).role === "Resourceful, Founder"
                    const isAi = (user as any).role === "AI Assistant"
                    return (
                      <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{user.display_name[0]}</AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          {/* Name only — the Host/AI/Attendee badge already
                              communicates the role-type; the post-call Rizz
                              Summary above shows the full role label, so
                              we skip the second line here to keep names
                              fully visible on the right column. */}
                          <div className="font-medium truncate">{user.display_name}</div>
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
                  <div className="text-sm font-medium">Action Items</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• Review API endpoints</div>
                    <div>• Update project documentation</div>
                    <div>• Plan next sprint</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  )
}
