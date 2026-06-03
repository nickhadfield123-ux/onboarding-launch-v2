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
  RotateCcw,
  Home
} from "lucide-react"

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
    <div className="space-y-6 text-white">
      {/* Meeting Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
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
        </div>
        <div className="flex-1 space-y-2 mx-6">
          <Badge variant="outline" className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(duration)}
          </Badge>
          <h1 className="text-2xl font-bold text-white">{displayTitle}</h1>
          <p className="text-gray-300">Session Summary & Next Steps</p>
        </div>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Session Details */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Session Details
              </CardTitle>
              <p className="text-sm text-muted-foreground">Key information about your call</p>
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

          {/* Participants */}
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
                      {"role" in user && (user as any).role && (
                        <div className="text-xs text-muted-foreground truncate">{(user as any).role}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>


          {/* Save Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Save Your Notes
              </CardTitle>
              <p className="text-sm text-muted-foreground">Capture any thoughts or ideas before leaving</p>
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
        </div>

        {/* Call Context */}
        <div className="space-y-6">
          {isDemoRoom && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Rizz Summary
                </CardTitle>
                <p className="text-sm text-muted-foreground">Generated from this call's transcript</p>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">Key Moments</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• Nick walked Rishi and Arjun through the live Resourceful dashboard and the Rizz intro flow end-to-end.</div>
                    <div>• Rishi mapped the current infrastructure: Next.js + Supabase + Daily.co, flagged Postgres connection-pool limits under load.</div>
                    <div>• Arjun demoed NexFlow's GitHub contributor onboarding framework and how it maps to Resourceful's open issues.</div>
                    <div>• Rizz flagged two open architecture threads (multi-tenant data model, agent runtime isolation) and proposed a follow-up doc.</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Decisions</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• NexFlow continues as embedded contributors for the next quarter, with a focus on the agent runtime.</div>
                    <div>• Infrastructure mapping doc to be co-authored by Rishi this week.</div>
                    <div>• Rizz becomes a first-class call participant in every Resourceful x NexFlow review.</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Action Items</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• Nick: send Rishi the Postgres pool config so he can size the next migration.</div>
                    <div>• Rishi: draft the infrastructure doc and share by Friday.</div>
                    <div>• Arjun: file the three highest-leverage onboarding issues in the Resourceful repo.</div>
                    <div>• Rizz: auto-generate a per-call architecture brief ahead of the next review.</div>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">Follow-ups</div>
                  <div className="text-xs text-muted-foreground space-y-1">
                    <div>• Next review in two weeks, same format, with the infrastructure doc as a pre-read.</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {!isDemoRoom && meeting.meeting_type === 'team-sync' && (
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
          )}
        </div>
      </div>
    </div>
  )
}