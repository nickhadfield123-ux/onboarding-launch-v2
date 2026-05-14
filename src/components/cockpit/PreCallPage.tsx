"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
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

// Mock user profiles
const MOCK_USERS = [
  { id: "1", display_name: "Sarah Chen", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah", is_online: true },
  { id: "2", display_name: "Marcus Webb", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Marcus", is_online: true },
  { id: "3", display_name: "Elena Rodriguez", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Elena", is_online: false },
  { id: "4", display_name: "James Kim", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=James", is_online: true },
  { id: "5", display_name: "Priya Patel", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=Priya", is_online: false },
]

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
  isLinkCopied 
}: PreCallPageProps) {
  // Verify component is rendering on client side
  console.log('🎨 PreCallPage rendering with:', { meeting, roomUrl })
  
  const { dispatch: rizzDispatch } = useRizz()
  const [showInviteModal, setShowInviteModal] = React.useState(false)
  const [selectedUsers, setSelectedUsers] = React.useState<Set<string>>(new Set())

  // Set Rizz mode to pre-call when component mounts
  React.useEffect(() => {
    rizzDispatch({ type: 'SET_MODE', payload: 'pre-call' })
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

  const formatMeetingTime = (date: Date | string) => {
    const d = new Date(date)
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const formatMeetingDate = (date: Date | string) => {
    const d = new Date(date)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    if (d.toDateString() === today.toDateString()) return 'Today'
    if (d.toDateString() === tomorrow.toDateString()) return 'Tomorrow'
    return d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const getMeetingTypeIcon = (type: string) => {
    switch (type) {
      case 'team-sync': return <Users className="h-4 w-4" />
      case 'strategy': return <FileText className="h-4 w-4" />
      case 'co-creation': return <MessageCircle className="h-4 w-4" />
      default: return <Video className="h-4 w-4" />
    }
  }

  const getMeetingTypeColor = (type: string) => {
    switch (type) {
      case 'team-sync': return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'strategy': return 'bg-green-100 text-green-800 border-green-200'
      case 'co-creation': return 'bg-purple-100 text-purple-800 border-purple-200'
      default: return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

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
          <div className="flex items-center gap-3">
            <Badge className={getMeetingTypeColor(meeting.meeting_type)}>
              {getMeetingTypeIcon(meeting.meeting_type)}
              <span className="ml-1">{meeting.meeting_type.replace('-', ' ')}</span>
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {formatMeetingDate(meeting.start_time)}
            </Badge>
            <Badge variant="outline" className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatMeetingTime(meeting.start_time)}
            </Badge>
          </div>
          <h1 className="text-2xl font-bold text-white">{meeting.title}</h1>
          {meeting.description && (
            <p className="text-muted-foreground">{meeting.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              console.log('🎯 Invite People button clicked!')
              console.log('📋 onInviteUsers function:', onInviteUsers)
              console.log('🎯 Setting showInviteModal to true')
              setShowInviteModal(true)
              console.log('✅ Invite modal opened')
            }}
            className="flex items-center gap-2 bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
          >
            <UserPlus className="h-4 w-4" />
            Invite People
          </Button>
          <button
            onClick={() => onJoinCall()}
            className="inline-flex items-center gap-2 bg-blue-600 
              hover:bg-blue-700 active:bg-blue-800 text-white 
              font-semibold px-6 py-2.5 rounded-lg transition-colors 
              duration-150 text-sm shadow-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" 
              height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5,3 19,12 5,21"/>
            </svg>
            Join Call
          </button>
          <Button
            variant="secondary"
            onClick={() => {
              console.log('🎯 Cancel button clicked!')
              // Navigate to user's hub
              const hubUrl = getHubUrl()
              window.location.href = hubUrl
            }}
            className="flex items-center gap-2 bg-slate-700 text-white hover:bg-slate-600"
          >
            <ChevronRight className="h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
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
                  onClick={() => {
                    console.log('🎯 Copy Link button clicked!')
                    console.log('📋 onCopyLink function:', onCopyLink)
                    console.log('🎯 Calling onCopyLink...')
                    onCopyLink()
                    console.log('✅ onCopyLink called successfully')
                  }}
            className="flex items-center gap-2 bg-slate-800 border-slate-600 text-white hover:bg-slate-700"
                >
                  <Copy className="h-4 w-4" />
                  {isLinkCopied ? 'Copied!' : 'Copy'}
                </Button>
              </div>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <span>Location: Virtual</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>Duration: {Math.round((new Date(meeting.end_time).getTime() - new Date(meeting.start_time).getTime()) / (1000 * 60))} min</span>
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
                {/* Online Participants */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Online Now</div>
                  <div className="space-y-2">
                    {MOCK_USERS.filter(u => u.is_online).map((user) => (
                      <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url} alt={user.display_name} />
                            <AvatarFallback>{user.display_name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background bg-green-500" />
                        </div>
                        <div className="flex-1">
                          <div className="font-medium">{user.display_name}</div>
                          <div className="text-xs text-muted-foreground">Online</div>
                        </div>
                        <Badge variant="secondary" className="text-xs">Host</Badge>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Expected Participants */}
                <div>
                  <div className="text-sm font-medium text-muted-foreground mb-2">Expected</div>
                  <div className="space-y-2">
                    {MOCK_USERS.filter(u => !u.is_online).map((user) => (
                      <div key={user.id} className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted">
                        <div className="relative">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={user.avatar_url} alt={user.display_name} />
                            <AvatarFallback>{user.display_name[0]}</AvatarFallback>
                          </Avatar>
                          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background bg-gray-400" />
                        </div>
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
                  onClick={() => {
                    console.log('🎯 Join Call Now button clicked!')
                    console.log('📋 onJoinCall function:', onJoinCall)
                    console.log('🎯 Calling onJoinCall...')
                    onJoinCall()
                    console.log('✅ onJoinCall called successfully')
                  }}
                  className="flex items-center gap-2 bg-primary hover:bg-primary/90 flex-1"
                >
                  <Play className="h-4 w-4" />
                  Join Call Now
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => {
                    console.log('🎯 Invite More button clicked!')
                    console.log('📋 onInviteUsers function:', onInviteUsers)
                    console.log('🎯 Setting showInviteModal to true')
                    setShowInviteModal(true)
                    console.log('✅ Invite modal opened')
                  }}
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
        </div>

        {/* Call Type Specific Content */}
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
          )}

          {meeting.meeting_type === 'strategy' && (
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
          )}

          {meeting.meeting_type === 'co-creation' && (
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
          )}
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
                {MOCK_USERS.map((user) => (
                  <div
                    key={user.id}
                    onClick={() => toggleUser(user.id)}
                    className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                      selectedUsers.has(user.id) 
                        ? 'bg-primary/20 border border-primary' 
                        : 'hover:bg-muted'
                    }`}
                  >
                    <div className="relative">
                      <Avatar className="h-10 w-10">
                        <AvatarImage src={user.avatar_url} alt={user.display_name} />
                        <AvatarFallback>{user.display_name[0]}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-background ${
                        user.is_online ? 'bg-green-500' : 'bg-gray-400'
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="font-medium">{user.display_name}</div>
                      <div className="text-xs text-muted-foreground">
                        {user.is_online ? 'Online' : 'Offline'}
                      </div>
                    </div>
                    {selectedUsers.has(user.id) && (
                      <Check className="h-5 w-5 text-primary" />
                    )}
                  </div>
                ))}
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
                  Invite {selectedUsers.size > 0 ? `(${selectedUsers.size})` : ''}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
