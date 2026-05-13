// @ts-nocheck
"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Textarea } from "@/components/ui/textarea"
import { Meeting } from "@/lib/meetings/types"
import { useCall, useRizz } from "@/lib/cockpit/context"
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

// Mock user profiles
const MOCK_USERS = [
  { id: "1", display_name: "Sarah Chen", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah", is_online: true },
  { id: "2", display_name: "Marcus Webb", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus", is_online: true },
  { id: "3", display_name: "Elena Rodriguez", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena", is_online: false },
  { id: "4", display_name: "James Kim", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=James", is_online: true },
  { id: "5", display_name: "Priya Patel", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya", is_online: false },
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
    rizzDispatch({ type: 'SET_MODE', payload: 'post-call' })
  }, [rizzDispatch])

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return '< 1 minute'
    const mins = Math.round(seconds / 60)
    return `${mins} minute${mins !== 1 ? 's' : ''}`
  }

  const getStatusBadge = () => {
    switch (status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800 border-green-200"><CheckCircle className="h-4 w-4 mr-1" /> Completed</Badge>
      case 'aborted':
        return <Badge className="bg-amber-100 text-amber-800 border-amber-200"><XCircle className="h-4 w-4 mr-1" /> Aborted</Badge>
      case 'cancelled':
        return <Badge className="bg-red-100 text-red-800 border-red-200"><XCircle className="h-4 w-4 mr-1" /> Cancelled</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  const handleSaveNotes = () => {
    if (onSaveNotes) {
      onSaveNotes(notes)
    }
  }

  const handleClearNotes = () => {
    setNotes('')
  }

  return (
    <div className="space-y-6 text-white">
      {/* Meeting Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {getStatusBadge()}
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatDuration(duration)}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
          <p className="text-gray-300">Session Summary & Next Steps</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="secondary" 
            onClick={onBackToHub}
            className="flex items-center gap-2"
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
                  <div className="font-medium">{MOCK_USERS.length}</div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Recording</div>
                  <div className="font-medium">Enabled</div>
                </div>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="text-sm text-muted-foreground mb-1">Status</div>
                  <div className="font-medium capitalize">{status}</div>
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
              <div className="space-y-3">
                <div className="space-y-2">
                  {MOCK_USERS.map((user) => (
                    <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={user.avatar_url} alt={user.display_name} />
                          <AvatarFallback>{user.display_name[0]}</AvatarFallback>
                        </Avatar>
                      </div>
                      <div className="flex-1">
                        <div className="font-medium">{user.display_name}</div>
                      </div>
                    </div>
                  ))}
                </div>
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
          {meeting.meeting_type === 'team-sync' && (
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