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
  
  // Client-side only rendering flag — prevents hydration mismatches
  // from Date formatting (different output on Node vs browser)
  const [isClient, setIsClient] = React.useState(false)
  React.useEffect(() => {
    setIsClient(true)
  }, [])
  
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

  return <div>PreCallPage</div>
}
